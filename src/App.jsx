// src/App.jsx (RE-INTRODUCED THE DETAILED UPDATE MODAL)

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import client from './sanityClient';
import './App.css';
import { Home, History, User as UserIcon, Phone, MapPin, Truck, CheckCircle, XCircle, Package, ArrowUpCircle, LogOut } from 'lucide-react';

// ===================================
// === UPDATE STATUS MODAL (NEW & IMPROVED) ===
// ===================================
const UpdateStatusModal = ({ parcel, onClose, onUpdate }) => {
    const [status, setStatus] = useState(parcel.status);
    const [notes, setNotes] = useState(parcel.deliveryNotes || '');
    const [newDate, setNewDate] = useState('');

    const handleUpdateClick = () => {
        if (window.confirm('Are you sure you want to update the status?')) {
            onUpdate(parcel._id, status, notes, newDate);
            onClose();
        }
    };

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <h3>Update Parcel: #{parcel.trackingNumber}</h3>
                <select className="modal-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="In Transit">In Transit</option>
                    <option value="On the way">On the way</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Returned">Returned</option>
                    <option value="Rescheduled">Rescheduled</option>
                </select>
                {status === 'Rescheduled' && (
                    <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} style={{width: '100%', boxSizing: 'border-box'}} />
                )}
                <textarea placeholder="Add notes if any (e.g., reason for return)" value={notes} onChange={(e) => setNotes(e.target.value)} rows="3"></textarea>
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
        e.preventDefault(); setIsLoading(true); setError('');
        try {
            const rider = await client.fetch(`*[_type == "rider" && username.current == $username && password == $password][0]`, { username, password });
            if (rider) { onLoginSuccess(rider); } else { setError('Invalid username or password.'); }
        } catch (err) { setError('An error occurred.'); } finally { setIsLoading(false); }
    };
    return (<div className="login-container"><img src="/logo.png" alt="Logo" className="login-logo"/><div className="login-box"><h2>Rider Login</h2><form onSubmit={handleLogin}><input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required /><input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />{error && <p className="error-message">{error}</p>}<button type="submit" disabled={isLoading}>{isLoading ? 'Logging in...' : 'Login'}</button></form></div></div>);
};

// ===================================
// === OTHER PAGE COMPONENTS (No changes) ===
// ===================================
const JobCard = ({ job, onUpdateStatus }) => { /* No changes */
    const isPickupRequest = job._type === 'deliveryOrder';
    return (<div className={`job-card ${isPickupRequest ? 'type-request' : 'type-parcel'}`}><div className="job-header"><h3>{isPickupRequest ? `Request #${job.orderId}` : `Parcel #${job.trackingNumber}`}</h3><span className={`job-type ${isPickupRequest ? 'type-request' : 'type-parcel'}`}>{isPickupRequest ? 'Pickup Request' : 'Parcel Delivery'}</span></div><div className="job-details"><div className="detail-item"><UserIcon size={16}/><div><strong>{isPickupRequest ? 'Pickup Contact' : 'Receiver'}</strong><span>{isPickupRequest ? job.pickupContactName : job.receiverDetails?.name}</span></div></div><div className="detail-item"><MapPin size={16}/><div><strong>{isPickupRequest ? 'Pickup Address' : 'Delivery Address'}</strong><span>{isPickupRequest ? job.pickupAddress : job.receiverDetails?.address}</span></div></div></div><div className="job-actions"><a href={`tel:${isPickupRequest ? job.pickupContactPhone : job.receiverDetails?.phone}`} className="action-btn call-btn"><Phone size={16}/> Call</a>{!isPickupRequest && job.destinationLocationLink && (<a href={job.destinationLocationLink} target="_blank" rel="noopener noreferrer" className="action-btn map-btn"><MapPin size={16}/> Map</a>)}<button onClick={() => onUpdateStatus(job)} className="action-btn update-btn">{isPickupRequest ? <><ArrowUpCircle size={16}/> Mark Picked Up</> : <><Package size={16}/> Update Status</>}</button></div></div>);
};
const HomePage = ({ jobs, onUpdateStatus }) => { /* No changes */
    const [view, setView] = useState('requests'); 
    const { requests, parcels, requestCount, parcelCount } = useMemo(() => {
        const reqs = jobs.filter(j => j._type === 'deliveryOrder');
        const pars = jobs.filter(j => j._type === 'parcel');
        return { requests: reqs, parcels: pars, requestCount: reqs.length, parcelCount: pars.length };
    }, [jobs]);
    return (<div className="page-content"><h2>Dashboard</h2><div className="dashboard-grid"><div className="summary-card"><div className="summary-card-title"><ArrowUpCircle size={16}/> Pending Pickups</div><div className="summary-card-value">{requestCount}</div></div><div className="summary-card"><div className="summary-card-title"><Truck size={16}/> Pending Deliveries</div><div className="summary-card-value">{parcelCount}</div></div></div><h2>Active Jobs</h2><div className="job-switcher"><button onClick={() => setView('requests')} className={view === 'requests' ? 'active' : ''}>Pickup Requests ({requestCount})</button><button onClick={() => setView('parcels')} className={view === 'parcels' ? 'active' : ''}>Parcel Deliveries ({parcelCount})</button></div>{view === 'requests' && (<div>{requests.length > 0 ? requests.map(job => <JobCard key={job._id} job={job} onUpdateStatus={onUpdateStatus} />) : <p>No active pickup requests found.</p>}</div>)}{view === 'parcels' && (<div>{parcels.length > 0 ? parcels.map(job => <JobCard key={job._id} job={job} onUpdateStatus={onUpdateStatus} />) : <p>No active parcel deliveries found.</p>}</div>)}</div>);
};
const HistoryPage = ({ riderId }) => { /* No changes */
    const [completedJobs, setCompletedJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const fetchHistory = async () => { setIsLoading(true); const query = `*[_type in ["deliveryOrder", "parcel"] && assignedRider._ref == $riderId && status in ["completed", "Delivered", "Returned"]] | order(_updatedAt desc)`; const data = await client.fetch(query, { riderId }); setCompletedJobs(data); setIsLoading(false); };
        fetchHistory();
    }, [riderId]);
    return (<div className="page-content"><h2>Completed Jobs History</h2>{isLoading ? <p>Loading history...</p> : (completedJobs.length > 0 ? completedJobs.map(job => { const isRequest = job._type === 'deliveryOrder'; const isSuccess = job.status === 'completed' || job.status === 'Delivered'; return (<div key={job._id} className="history-item"><div className="history-header"><strong>{isRequest ? `Request #${job.orderId}` : `Parcel #${job.trackingNumber}`}</strong><span className="history-status" style={{ color: isSuccess ? 'var(--accent-green)' : 'var(--accent-pink)'}}>{isSuccess ? <CheckCircle size={16}/> : <XCircle size={16}/>} {job.status}</span></div><div className="history-details"><p><strong>{isRequest ? 'Picked from:' : 'Delivered to:'}</strong> {isRequest ? job.pickupContactName : job.receiverDetails?.name}</p><p><strong>Completed:</strong> {new Date(job._updatedAt).toLocaleString()}</p></div></div>) }) : <p>No completed jobs found.</p>)}</div>);
};
const ProfilePage = ({ rider, onLogout }) => ( /* No changes */
    <div className="page-content"><h2>My Profile</h2><div className="profile-card"><div className="profile-info"><div><strong>Full Name:</strong> <span>{rider.fullName}</span></div><div><strong>Rider ID:</strong> <span>{rider.riderId}</span></div><div><strong>Phone:</strong> <span>{rider.phone}</span></div><div><strong>Vehicle:</strong> <span>{rider.vehicleType} - {rider.vehicleNumber}</span></div></div><button onClick={onLogout} className="logout-btn"><LogOut size={16} /> Logout</button></div></div>
);

// ===================================
// === MAIN LOGGED-IN APP ===
// ===================================
const MainApp = ({ rider, onLogout }) => {
    const [activeTab, setActiveTab] = useState('home');
    const [activeJobs, setActiveJobs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedParcelForModal, setSelectedParcelForModal] = useState(null); // <-- ADDED THIS STATE

    const fetchActiveJobs = useCallback(async () => { /* No changes */
        const query = `*[_type in ["deliveryOrder", "parcel"] && assignedRider._ref == $riderId && status in ["assigned", "Pending", "In Transit", "On the way", "Rescheduled"]]`;
        const data = await client.fetch(query, { riderId: rider._id });
        setActiveJobs(data);
        setIsLoading(false);
    }, [rider._id]);

    useEffect(() => { /* No changes */
        fetchActiveJobs();
        const subscription = client.listen(`*[_type in ["deliveryOrder", "parcel"] && assignedRider._ref == $riderId]`, { riderId: rider._id }).subscribe(fetchActiveJobs);
        return () => subscription.unsubscribe();
    }, [fetchActiveJobs, rider._id]);

    // This function now decides what to do when "Update Status" is clicked
    const handleUpdateStatus = (job) => { // <-- CHANGED
        if (job._type === 'deliveryOrder') {
            if (window.confirm(`Mark request #${job.orderId} as picked up?`)) {
                client.patch(job._id).set({ status: 'completed' }).commit().then(() => {
                    alert(`Request #${job.orderId} updated!`);
                    fetchActiveJobs(); // Refresh list after update
                });
            }
        } else if (job._type === 'parcel') {
            // For parcels, we open the modal instead of updating directly
            setSelectedParcelForModal(job);
        }
    };

    // This new function handles the update FROM the modal
    const handleModalUpdate = async (parcelId, status, notes, newDate) => { // <-- ADDED THIS FUNCTION
        const patch = client.patch(parcelId).set({ status, deliveryNotes: notes });
        if (status === 'Rescheduled' && newDate) {
            patch.set({ newDeliveryDate: newDate });
        }
        try {
            await patch.commit();
            alert(`Parcel status updated to ${status}!`);
            fetchActiveJobs(); // Refresh the list
        } catch (err) { alert('Failed to update status.'); }
    };

    const renderPage = () => { /* No changes */
        switch(activeTab) {
            case 'home': return <HomePage jobs={activeJobs} onUpdateStatus={handleUpdateStatus} />;
            case 'history': return <HistoryPage riderId={rider._id} />;
            case 'profile': return <ProfilePage rider={rider} onLogout={onLogout} />;
            default: return <HomePage jobs={activeJobs} onUpdateStatus={handleUpdateStatus} />;
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
            {/* Conditionally render the modal here */}
            {selectedParcelForModal && 
                <UpdateStatusModal 
                    parcel={selectedParcelForModal} 
                    onClose={() => setSelectedParcelForModal(null)} 
                    onUpdate={handleModalUpdate} 
                />
            }
        </div>
    );
};

// ===================================
// === TOP LEVEL APP ===
// ===================================
export default function App() { /* No changes */
    const [loggedInRider, setLoggedInRider] = useState(null);
    useEffect(() => { const savedRider = localStorage.getItem('rider'); if (savedRider) setLoggedInRider(JSON.parse(savedRider)); }, []);
    const handleLoginSuccess = (rider) => { localStorage.setItem('rider', JSON.stringify(rider)); setLoggedInRider(rider); };
    const handleLogout = () => { localStorage.removeItem('rider'); setLoggedInRider(null); };
    return (<div className="app-wrapper">{loggedInRider ? <MainApp rider={loggedInRider} onLogout={handleLogout} /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}</div>);
}