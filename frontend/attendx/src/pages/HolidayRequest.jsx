import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const HolidayRequest = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [numberOfDays, setNumberOfDays] = useState(0);
    const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const calculateDays = (start, end) => {
        if (!start || !end) return 0;
        let count = 0;
        const startDate = new Date(start);
        const endDate = new Date(end);

        while (startDate <= endDate) {
            const day = startDate.getDay();
            if (day !== 0 && day !== 6) {
                count++;
            }
            startDate.setDate(startDate.getDate() + 1);
        }
        return count;
    };

    const handleFromDateChange = (e) => {
        setFromDate(e.target.value);
        setNumberOfDays(calculateDays(e.target.value, toDate));
    };

    const handleToDateChange = (e) => {
        setToDate(e.target.value);
        setNumberOfDays(calculateDays(fromDate, e.target.value));
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_URL}/api/staff/holiday-payout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    fromDate,
                    toDate,
                    numberOfDays,
                    targetMonth,
                    reason
                })
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Holiday payout request submitted successfully!');
                setFromDate('');
                setToDate('');
                setNumberOfDays(0);
                setTargetMonth(new Date().toISOString().slice(0, 7));
                setReason('');
                setTimeout(() => navigate('/staff'), 2000);
            } else {
                setMessage(data.message || data.msg || 'Error submitting request');
            }
        } catch (error) {
            setMessage('Network error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        container: {
            fontFamily: 'sans-serif',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            margin: 0,
            padding: '1rem',
            boxSizing: 'border-box',
            backgroundColor: '#ffffff',
            color: '#000000',
        },
        formContainer: {
            width: '100%',
            maxWidth: '800px',
            padding: '2rem',
            border: '1px solid #000000',
            borderRadius: '20px',
            boxSizing: 'border-box',
        },
        formGrid: {
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            alignItems: 'start'
        },
        formGroup: {
            marginBottom: '1rem',
        },
        label: {
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '500',
        },
        input: {
            width: '100%',
            padding: '0.75rem',
            boxSizing: 'border-box',
            border: '1px solid #000000',
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            color: '#000000',
            fontSize: '1rem',
        },
        textarea: {
            width: '100%',
            padding: '0.5rem 0',
            boxSizing: 'border-box',
            border: 'none',
            borderBottom: '2px solid #000000',
            borderRadius: '0',
            backgroundColor: 'transparent',
            color: '#000000',
            fontSize: '1.05rem',
            fontFamily: 'inherit',
            minHeight: '160px',
            resize: 'vertical',
            lineHeight: '1.4'
        },
        button: {
            width: '100%',
            padding: '0.75rem',
            marginTop: '0.5rem',
            backgroundColor: '#000000',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: loading ? 0.6 : 1,
            transition: 'opacity 0.3s',
        },
        calculatedDays: {
            margin: '1rem 0',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '0.75rem',
            backgroundColor: '#f2f2f2',
            borderRadius: '10px',
        },
        title: {
            textAlign: 'center',
            marginBottom: '1.5rem',
            fontSize: '1.5rem',
            lineHeight: '1.2',
        },
        message: {
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '10px',
            textAlign: 'center',
            fontWeight: '500',
            backgroundColor: message.includes('Error') || message.includes('Network') ? '#ececec' : '#f5f5f5',
            color: '#000000',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h1 style={styles.title}>Holiday Payment Request</h1>
                {message && <div style={styles.message}>{message}</div>}
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGrid}>
                      <div style={styles.formGroup}>
                          <label htmlFor="from-date" style={styles.label}>From Date</label>
                          <input type="date" id="from-date" value={fromDate} onChange={handleFromDateChange} style={styles.input} required />
                      </div>

                      <div style={styles.formGroup}>
                          <label htmlFor="to-date" style={styles.label}>To Date</label>
                          <input type="date" id="to-date" value={toDate} onChange={handleToDateChange} style={styles.input} required />
                      </div>

                      <div style={{ ...styles.calculatedDays, gridColumn: '1 / -1' }}>
                          Number of Days: {numberOfDays}
                      </div>

                      <div style={styles.formGroup}>
                          <label htmlFor="target-month" style={styles.label}>Target Month</label>
                          <input type="month" id="target-month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} style={styles.input} required />
                      </div>

                      <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                          <label htmlFor="reason" style={styles.label}>Reason/Notes (Optional)</label>
                          <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} style={styles.textarea} placeholder="Enter any additional notes or reason for this request..." />
                      </div>

                      <div style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" style={styles.button} disabled={loading}>
                            {loading ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default HolidayRequest;

