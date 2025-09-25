import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import client from './sanityClient';
import './App.css';
import { Home, History, User as UserIcon, Phone, MapPin, Truck, CheckCircle, XCircle, Package, ArrowUpCircle, LogOut, Utensils, RefreshCw } from 'lucide-react';

const UpdateStatusModal = ({ job, onClose, onUpdate }) => {
    const isFoodOrder = job._type === 'foodOrder';
    const initialStatus = isFoodOrder ? (job.orderStatus || 'preparing') : (job.status || 'In Transit');
    const [status, setStatus] = useState(initialStatus);
    const [notes, setNotes] = useState(job.deliveryNotes || '');
    const [newDate, setNewDate] = useState('');
    const foodStatuses = ['preparing', 'onTheWay', 'nearDestination', 'completed', 'cancelled'];
    const parcelStatuses = ['In Transit', 'On the way', 'Delivered', 'Returned', 'Rescheduled'];
    const availableStatuses = isFoodOrder ? foodStatuses : parcelStatuses;
    const handleUpdateClick = () => {
        onUpdate(job._id, status, notes, newDate, isFoodOrder);
        onClose();
    };
    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Update: #{isFoodOrder ? job.receiverName : job.trackingNumber}</h3>
                <select className="modal-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {availableStatuses.map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</option>)}
                </select>
                {status === 'Rescheduled' && (<input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{width: '100%', boxSizing: 'border-box'}} />)}
                <textarea placeholder="Add notes if any (e.g., reason for return)" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3"></textarea>
                <div className="modal-actions">
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleUpdateClick} className="btn-primary">Update Status</button>
                </div>
            </div>
        </div>
    );
};

const LoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleLogin = async (e) => {
        e.preventDefault(); setIsLoading(true); setError('');
        try {
            const rider = await client.fetch(`*[_type == "rider" && username.current == $username && password == $password][0]`, { username, password });
            if (rider) { onLoginSuccess(rider); } else { setError('Invalid username or password.'); }
        } catch (err) { setError('An error occurred.'); } finally { setIsLoading(false); }
    };
    return (<div className="login-container"><img src="/logo.png" alt="Logo" className="login-logo"/><div className="login-box"><h2>Rider Login</h2><form onSubmit={handleLogin}><input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required /><input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p className="error-message">{error}</p>}<button type="submit" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button></form></div></div>);
};

const JobCard = ({ job, onUpdateStatus }) => {
    const isFoodOrder = job._type === 'foodOrder';
    const isPickupRequest = job._type === 'deliveryOrder';
    let title, icon, primaryContact, primaryAddress, callNumber, mapLink;
    if (isFoodOrder) {
        title = `Food for ${job.receiverName}`; icon = <Utensils size={14}/>; primaryContact = job.receiverName;
        primaryAddress = `Pickup from ${job.restaurant?.name || 'N/A'}`; callNumber = job.receiverContact; mapLink = job.deliveryAddress;
    } else if (isPickupRequest) {
        title = `Request #${job.orderId}`; icon = <ArrowUpCircle size={14}/>; primaryContact = job.pickupContactName;
        primaryAddress = job.pickupAddress; callNumber = job.pickupContactPhone; mapLink = null;
    } else {
        title = `Parcel #${job.trackingNumber}`; icon = <Package size={14}/>; primaryContact = job.receiverDetails?.name;
        primaryAddress = job.receiverDetails?.address; callNumber = job.receiverDetails?.phone; mapLink = job.destinationLocationLink;
    }
    return (
        <div className={`job-card type-${isFoodOrder ? 'food' : (isPickupRequest ? 'request' : 'parcel')}`}>
            <div className="job-header"><h3>{title}</h3><span className={`job-type type-${isFoodOrder ? 'food' : (isPickupRequest ? 'request' : 'parcel')}`}>{icon} {isFoodOrder ? 'Food Delivery' : (isPickupRequest ? 'Pickup Request' : 'Parcel Delivery')}</span></div>
            <div className="job-details">
                <div className="detail-item"><UserIcon size={16}/><div><strong>{isFoodOrder ? 'Customer' : (isPickupRequest ? 'Pickup Contact' : 'Receiver')}</strong><span>{primaryContact}</span></div></div>
                <div className="detail-item"><MapPin size={16}/><div><strong>{isFoodOrder ? 'Pickup From' : (isPickupRequest ? 'Pickup Address' : 'Delivery Address')}</strong><span>{primaryAddress}</span></div></div>
            </div>
            <div className="job-actions">
                <a href={`tel:${callNumber}`} className="action-btn call-btn"><Phone size={16}/> Call</a>
                {mapLink && (<a href={mapLink} target="_blank" rel="noopener noreferrer" className="action-btn map-btn"><MapPin size={16}/> Map</a>)}
                <button onClick={() => onUpdateStatus(job)} className="action-btn update-btn">
                    {isPickupRequest ? <><CheckCircle size={16}/> Mark Picked Up</> : <><RefreshCw size={16}/> Update Status</>}
                </button>
            </div>
        </div>
    );
};
const HomePage = ({ jobs, onUpdateStatus, riderName }) => {
    const { requests, parcels, foods, requestCount, parcelCount, foodCount } = useMemo(() => {
        const reqs = jobs.filter(j => j._type === 'deliveryOrder');
        const pars = jobs.filter(j => j._type === 'parcel');
        const fods = jobs.filter(j => j._type === 'foodOrder');
        return { requests: reqs, parcels: pars, foods: fods, requestCount: reqs.length, parcelCount: pars.length, foodCount: fods.length };
    }, [jobs]);
    const allJobsSorted = [...foods, ...parcels, ...requests].sort((a, b) => new Date(b.createdAt || b._createdAt) - new Date(a.createdAt || a._createdAt));

    return (<div className="page-content"><h2>Welcome, {riderName.split(' ')[0]}!</h2><div className="dashboard-grid"><div className="summary-card"><div className="summary-card-title"><Utensils size={16}/> Food Orders</div><div className="summary-card-value">{foodCount}</div></div><div className="summary-card"><div className="summary-card-title"><Truck size={16}/> Parcel Deliveries</div><div className="summary-card-value">{parcelCount}</div></div><div className="summary-card full-width"><div className="summary-card-title"><ArrowUpCircle size={16}/> Pickup Requests</div><div className="summary-card-value">{requestCount}</div></div></div><h2>Your Active Jobs ({jobs.length})</h2>{allJobsSorted.length > 0 ? allJobsSorted.map(job => <JobCard key={job._id} job={job} onUpdateStatus={onUpdateStatus} />) : <p>No active jobs found. You're all clear!</p>}</div>);
};
const HistoryPage = ({ riderId }) => {
    const [completedJobs, setCompletedJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchHistory = async () => { setIsLoading(true); const query = `*[_type in ["deliveryOrder", "parcel", "foodOrder"] && assignedRider._ref == $riderId && (status in ["completed", "Delivered", "Returned"] || orderStatus in ["completed", "cancelled"])] | order(_updatedAt desc)`; const data = await client.fetch(query, { riderId }); setCompletedJobs(data); setIsLoading(false); };
        fetchHistory();
    }, [riderId]);
    return (<div className="page-content"><h2>Completed Jobs History</h2>{isLoading ? <p>Loading history...</p> : (completedJobs.length > 0 ? completedJobs.map(job => { const isRequest = job._type === 'deliveryOrder'; const isFood = job._type === 'foodOrder'; const status = isFood ? job.orderStatus : job.status; const isSuccess = status === 'completed' || status === 'Delivered'; return (<div key={job._id} className="history-item"><div className="history-header"><strong>{isFood ? `Food for ${job.receiverName}` : (isRequest ? `Request #${job.orderId}` : `Parcel #${job.trackingNumber}`)}</strong><span className="history-status" style={{ color: isSuccess ? 'var(--accent-green)' : 'var(--accent-pink)'}}>{isSuccess ? <CheckCircle size={16}/> : <XCircle size={16}/>} {status}</span></div><div className="history-details"><p><strong>{isRequest ? 'Picked from:' : (isFood ? 'Customer:' : 'Delivered to:')}</strong> {isRequest ? job.pickupContactName : (isFood ? job.receiverName : job.receiverDetails?.name)}</p><p><strong>Completed:</strong> {new Date(job._updatedAt).toLocaleString()}</p></div></div>) }) : <p>No completed jobs found.</p>)}</div>);
};
const ProfilePage = ({ rider, onLogout }) => (
    <div className="page-content"><h2>My Profile</h2><div className="profile-card"><div className="profile-info"><div><strong>Full Name:</strong> <span>{rider.fullName}</span></div><div><strong>Rider ID:</strong> <span>{rider.riderId}</span></div><div><strong>Phone:</strong> <span>{rider.phone}</span></div><div><strong>Vehicle:</strong> <span>{rider.vehicleType} - {rider.vehicleNumber}</span></div></div><button onClick={onLogout} className="logout-btn"><LogOut size={16} /> Logout</button></div></div>
);

const MainApp = ({ rider, onLogout }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [activeJobs, setActiveJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedJobForModal, setSelectedJobForModal] = useState(null);
    const fetchActiveJobs = useCallback(async () => {
        const query = `*[_type in ["deliveryOrder", "parcel", "foodOrder"] && assignedRider._ref == $riderId && (status in ["assigned", "Pending", "In Transit", "On the way", "Rescheduled"] || orderStatus in ["preparing", "onTheWay", "nearDestination"])] { ..., "restaurant": restaurant->{name} }`;
        const data = await client.fetch(query, { riderId: rider._id });
        setActiveJobs(data); setIsLoading(false);
    }, [rider._id]);
    useEffect(() => {
        fetchActiveJobs();
        const subscription = client.listen(`*[_type in ["deliveryOrder", "parcel", "foodOrder"] && assignedRider._ref == "${rider._id}"]`).subscribe(fetchActiveJobs);
        return () => subscription.unsubscribe();
    }, [fetchActiveJobs, rider._id]);
    const handleUpdateStatus = (job) => {
        if (job._type === 'deliveryOrder') {
            if (window.confirm(`Mark request #${job.orderId} as picked up?`)) {
                client.patch(job._id).set({ status: 'completed' }).commit().then(fetchActiveJobs);
            }
        } else { setSelectedJobForModal(job); }
    };
    const handleModalUpdate = async (jobId, status, notes, newDate, isFoodOrder) => {
        const statusField = isFoodOrder ? 'orderStatus' : 'status';
        const patch = client.patch(jobId).set({ [statusField]: status, deliveryNotes: notes });
        if (status === 'Rescheduled' && newDate) patch.set({ newDeliveryDate: newDate });
        try {
            await patch.commit();
            alert(`Job status updated to ${status}!`);
            fetchActiveJobs();
        } catch (err) { alert('Failed to update status.'); }
    };
    const renderPage = () => {
        switch(activeTab) {
            case 'home': return <HomePage jobs={activeJobs} onUpdateStatus={handleUpdateStatus} riderName={rider.fullName} />;
            case 'history': return <HistoryPage riderId={rider._id} />;
            case 'profile': return <ProfilePage rider={rider} onLogout={onLogout} />;
            default: return <HomePage jobs={activeJobs} onUpdateStatus={handleUpdateStatus} riderName={rider.fullName} />;
        }
    };
    return (
        <div className="main-app-container">
            <header className="main-header"><img src="/logo.png" alt="Logo" className="header-logo"/><div className="rider-info"><strong>{rider.fullName}</strong></div></header>
            <div className="content-area">{isLoading ? <p>Loading data...</p> : renderPage()}</div>
            <nav className="bottom-nav">
                <button onClick={() => setActiveTab('home')} className={activeTab === 'home' ? 'active' : ''}><Home/><span>Home</span></button>
                <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'active' : ''}><History/><span>History</span></button>
                <button onClick={() => setActiveTab('profile')} className={activeTab === 'profile' ? 'active' : ''}><UserIcon/><span>Profile</span></button>
            </nav>
            {selectedJobForModal && <UpdateStatusModal job={selectedJobForModal} onClose={() => setSelectedJobForModal(null)} onUpdate={handleModalUpdate} />}
        </div>
    );
};

export default function App() {
    const [loggedInRider, setLoggedInRider] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const logoutTimerId = useRef(null);

    const handleLogout = useCallback(() => {
        sessionStorage.removeItem('rider');
        setLoggedInRider(null);
        if (logoutTimerId.current) {
            clearTimeout(logoutTimerId.current);
        }
    }, []);

    const resetTimer = useCallback(() => {
        if (logoutTimerId.current) {
            clearTimeout(logoutTimerId.current);
        }
        logoutTimerId.current = setTimeout(() => {
            alert("You have been logged out due to 5 minutes of inactivity.");
            handleLogout();
        }, 5 * 60 * 1000);
    }, [handleLogout]);

    useEffect(() => {
        if (loggedInRider) {
            const events = ['mousemove', 'keydown', 'click', 'scroll'];
            events.forEach(event => window.addEventListener(event, resetTimer));
            resetTimer();

            return () => {
                events.forEach(event => window.removeEventListener(event, resetTimer));
                if (logoutTimerId.current) {
                    clearTimeout(logoutTimerId.current);
                }
            };
        }
    }, [loggedInRider, resetTimer]);

    useEffect(() => { 
        const savedRider = sessionStorage.getItem('rider'); 
        if (savedRider) {
            setLoggedInRider(JSON.parse(savedRider));
        }
        setIsLoading(false);
    }, []);

    const handleLoginSuccess = (rider) => { 
        sessionStorage.setItem('rider', JSON.stringify(rider)); 
        setLoggedInRider(rider); 
    };

    if (isLoading) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading App...</div>;
    }

    return (
        <div className="app-wrapper">
            {loggedInRider ? 
                <MainApp rider={loggedInRider} onLogout={handleLogout} /> : 
                <LoginPage onLoginSuccess={handleLoginSuccess} />
            }
        </div>
    );
}