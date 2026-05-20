import React, { useState } from 'react';

const HolidayRequest = () => {
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [numberOfDays, setNumberOfDays] = useState(0);
    const [targetMonth, setTargetMonth] = useState(new Date().toISOString().slice(0, 7));

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
    
    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Holiday payment request submitted for ${numberOfDays} days in ${targetMonth}.`);
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
            maxWidth: '400px',
            padding: '2rem',
            border: '1px solid #000000',
            borderRadius: '20px',
            boxSizing: 'border-box',
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
        },
        calculatedDays: {
            margin: '1rem 0',
            fontWeight: 'bold',
            textAlign: 'center',
            padding: '0.75rem',
            backgroundColor: '#f0f0f0',
            borderRadius: '10px',
        },
        title: {
            textAlign: 'center',
            marginBottom: '1.5rem',
            fontSize: '1.5rem',
            lineHeight: '1.2',
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.formContainer}>
                <h1 style={styles.title}>Holiday Payment Request</h1>
                <form onSubmit={handleSubmit}>
                    <div style={styles.formGroup}>
                        <label htmlFor="from-date" style={styles.label}>From Date</label>
                        <input type="date" id="from-date" value={fromDate} onChange={handleFromDateChange} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="to-date" style={styles.label}>To Date</label>
                        <input type="date" id="to-date" value={toDate} onChange={handleToDateChange} style={styles.input} />
                    </div>
                    <div style={styles.calculatedDays}>
                        Number of Days: {numberOfDays}
                    </div>
                    <div style={styles.formGroup}>
                        <label htmlFor="target-month" style={styles.label}>Target Month</label>
                        <input type="month" id="target-month" value={targetMonth} onChange={(e) => setTargetMonth(e.target.value)} style={styles.input} />
                    </div>
                    <button type="submit" style={styles.button}>Submit</button>
                </form>
            </div>
        </div>
    );
};

export default HolidayRequest;
