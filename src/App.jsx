import React, { useState, useEffect, useMemo, useCallback } from 'react';
import client from './sanityClient';
import './App.css';
import { Home, Package, History, User as UserIcon, Clock, MapPin, Phone, LogOut } from 'lucide-react';

// ===================================
// === LIVE CLOCK COMPONENT ===
// ===================================
const LiveClock = () => {
    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return <div className="live-clock"><Clock size={16}/> {time.toLocaleTimeString()}</div>
};

// ===================================
// === UPDATE STATUS MODAL COMPONENT ===
// ===================================
const UpdateStatusModal = ({ parcel, onClose, onUpdate }) => {
    const [status, setStatus] = useState(parcel.status);
    const [newDate, setNewDate] = useState('');
    const [notes, setNotes] = useState('');

    const handleUpdateClick = () => {
        if (window.confirm('Are you sure you want to update the status?')) {
            onUpdate(parcel._id, status, newDate, notes);
            onClose();
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Update: #{parcel.trackingNumber}</h3>
                <select className="modal-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="In Transit">In Transit</option>
                    <option value="On the way">On the way (Today's Delivery)</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Returned">Returned</option>
                    <option value="Rescheduled">Rescheduled</option>
                </select>

                {status === 'Rescheduled' && (
                    <div className="reschedule-fields">
                        <label>New Delivery Date:</label>
                        <input type="date" onChange={(e) => setNewDate(e.target.value)} />
                        <label>Reason / Note:</label>
                        <textarea placeholder="e.g., Customer not available" onChange={(e) => setNotes(e.target.value)}></textarea>
                    </div>
                )}

                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleUpdateClick} className="btn-primary">Update Status</button>
                </div>
            </div>
        </div>
    );
};


// ===================================
// === LOGIN COMPONENT ===
// ===================================
const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const query = `*[_type == "rider" && username.current == $username && password == $password][0]`;
            const params = { username, password };
            const rider = await client.fetch(query, params);
            if (rider) {
                onLoginSuccess(rider);
            } else {
                setError('Invalid username or password.');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h2>Rider Login</h2>
                <form onSubmit={handleLogin}>
                    <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                    <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    {error && <p className="error-message">{error}</p>}
                    <button type="submit" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button>
                </form>
            </div>
        </div>
    );
};

// ===================================
// === HOME PAGE COMPONENT ===
// ===================================
const HomePage = ({ rider, parcels }) => {
    const summary = useMemo(() => {
        const assigned = parcels.filter(p => ['Pending', 'In Transit', 'On the way', 'Rescheduled'].includes(p.status));
        const deliveredToday = parcels.filter(p => {
            if (p.status !== 'Delivered') return false;
            // A better way to get updated date is from Sanity's _updatedAt field
            const deliveredDate = new Date(p._updatedAt).toDateString();
            const today = new Date().toDateString();
            return deliveredDate === today;
        });
        return { assignedCount: assigned.length, deliveredTodayCount: deliveredToday.length };
    }, [parcels]);

    return (
        <div className="page-content">
            <h2>Today's Summary</h2>
            <div className="summary-grid">
                <div className="summary-card">
                    <Package size={32} />
                    <span>Assigned Parcels</span>
                    <strong>{summary.assignedCount}</strong>
                </div>
                <div className="summary-card">
                    <History size={32} />
                    <span>Delivered Today</span>
                    <strong>{summary.deliveredTodayCount}</strong>
                </div>
            </div>
        </div>
    );
};

// ===================================
// === PARCEL CARD COMPONENT ===
// ===================================
const ParcelCard = ({ parcel, onUpdateClick }) => {
    const isClosed = parcel.status === 'Delivered' || parcel.status === 'Returned';
    return (
        <div className={`parcel-card status-${parcel.status?.toLowerCase().replace(/\s+/g, '-')}`}>
            <h3>#{parcel.trackingNumber}</h3>
            <div className="parcel-details">
                <div><h4><UserIcon size={16} /> Receiver</h4><p>{parcel.receiverDetails.name}</p></div>
                <div><h4><MapPin size={16} /> Address</h4><p>{parcel.receiverDetails.address}</p></div>
            </div>
            <div className="parcel-actions">
                <a href={`tel:${parcel.receiverDetails.phone || parcel.senderDetails.phone}`} className="action-btn call-btn"><Phone size={16}/> Call</a>
                <a href={parcel.destinationLocationLink} target="_blank" rel="noopener noreferrer" className="action-btn map-btn"><MapPin size={16}/> Map</a>
                <button onClick={() => onUpdateClick(parcel)} disabled={isClosed} className="action-btn update-btn">{isClosed ? 'Closed' : 'Update'}</button>
            </div>
        </div>
    );
};

// ===================================
// === PARCELS PAGE COMPONENT ===
// ===================================
const ParcelsPage = ({ parcels, onUpdateClick }) => {
    const activeParcels = useMemo(() => 
        parcels.filter(p => ['Pending', 'In Transit', 'On the way', 'Rescheduled'].includes(p.status)),
    [parcels]);

    return (
        <div className="page-content">
            <h2>Assigned Parcels</h2>
            {activeParcels.length > 0 
                ? activeParcels.map(p => <ParcelCard key={p._id} parcel={p} onUpdateClick={onUpdateClick} />)
                : <p>No active parcels assigned.</p>
            }
        </div>
    );
};

// ===================================
// === HISTORY PAGE COMPONENT ===
// ===================================
const HistoryPage = ({ parcels }) => {
    const completedParcels = useMemo(() => 
        parcels.filter(p => ['Delivered', 'Returned'].includes(p.status)),
    [parcels]);

    return (
        <div className="page-content">
            <h2>Completed History</h2>
            {completedParcels.length > 0 
                ? completedParcels.map(p => <ParcelCard key={p._id} parcel={p} onUpdateClick={() => {}} />)
                : <p>No completed parcels in your history.</p>
            }
        </div>
    );
};

// ===================================
// === PROFILE PAGE COMPONENT ===
// ===================================
const ProfilePage = ({ rider, onLogout }) => (
    <div className="page-content">
        <h2>My Profile</h2>
        <div className="profile-card">
            <strong>{rider.fullName}</strong>
            <span>Rider ID: {rider.riderId}</span>
            <span>Phone: {rider.phone}</span>
            <button onClick={onLogout} className="logout-btn"><LogOut size={16} /> Logout</button>
        </div>
    </div>
);

// ===================================
// === BOTTOM NAV BAR COMPONENT ===
// ===================================
const BottomNavBar = ({ activeTab, setActiveTab }) => (
    <nav className="bottom-nav">
        <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'active' : ''}><Home/><span>Home</span></button>
        <button onClick={() => setActiveTab('parcels')} className={activeTab === 'parcels' ? 'active' : ''}><Package/><span>Parcels</span></button>
        <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'active' : ''}><History/><span>History</span></button>
        <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}><UserIcon/><span>Profile</span></button>
    </nav>
);

// ===================================
// === MAIN LOGGED-IN APP ===
// ===================================
const MainApp = ({ rider, onLogout }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [parcels, setParcels] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedParcel, setSelectedParcel] = useState(null);

    const fetchParcels = useCallback(async () => {
        const query = `*[_type == "parcel" && assignedRider._ref == $riderId] | order(createdAt desc)`;
        const params = { riderId: rider._id };
        const data = await client.fetch(query, params);
        setParcels(data);
        setIsLoading(false);
    }, [rider._id]);

    useEffect(() => {
        fetchParcels();
        const subscription = client.listen(`*[_type == "parcel" && assignedRider._ref == $riderId]`, {}).subscribe(() => fetchParcels());
        return () => subscription.unsubscribe();
    }, [fetchParcels]);

    const handleStatusUpdate = async (parcelId, newStatus, newDate, notes) => {
        const patch = client.patch(parcelId).set({ status: newStatus });
        if (newStatus === 'Rescheduled' && newDate) {
            patch.set({ newDeliveryDate: newDate, deliveryNotes: notes });
        }
        try {
            await patch.commit();
            alert(`Parcel status updated!`);
        } catch (err) {
            alert('Failed to update status.');
        }
    };

    const renderPage = () => {
        switch(activeTab) {
            case 'home': return <HomePage rider={rider} parcels={parcels} />;
            case 'parcels': return <ParcelsPage parcels={parcels} onUpdateClick={setSelectedParcel} />;
            case 'history': return <HistoryPage parcels={parcels} />;
            case 'profile': return <ProfilePage rider={rider} onLogout={onLogout} />;
            default: return <HomePage rider={rider} parcels={parcels} />;
        }
    };
    
    return (
        <div className="main-app-container">
            <header className="main-header">
                <img src="/logo.png" alt="RapidGo" className="header-logo"/>
                <LiveClock />
            </header>
            <div className="content-area">
                {isLoading ? <p>Loading data...</p> : renderPage()}
            </div>
            <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
            {selectedParcel && <UpdateStatusModal parcel={selectedParcel} onClose={() => setSelectedParcel(null)} onUpdate={handleStatusUpdate} />}
        </div>
    );
};

// ===================================
// === TOP LEVEL APP COMPONENT ===
// ===================================
function App() {
    const [loggedInRider, setLoggedInRider] = useState(null);

    useEffect(() => {
        const savedRider = localStorage.getItem('rider');
        if (savedRider) setLoggedInRider(JSON.parse(savedRider));
    }, []);

    const handleLoginSuccess = (rider) => {
        setLoggedInRider(rider);
        localStorage.setItem('rider', JSON.stringify(rider));
    };

    const handleLogout = () => {
        setLoggedInRider(null);
        localStorage.removeItem('rider');
    };

    return (
        <div className="app-wrapper">
            {loggedInRider ? (
                <MainApp rider={loggedInRider} onLogout={handleLogout} />
            ) : (
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            )}
        </div>
    );
}

export default App;