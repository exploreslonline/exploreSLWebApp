// PayHereNotify.jsx - Frontend component to handle PayHere notifications
import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

const PayHereNotify = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing payment notification...');

  useEffect(() => {
    const processNotification = async () => {
      try {
        // Get all URL parameters
        const notificationData = {
          merchant_id: searchParams.get('merchant_id'),
          order_id: searchParams.get('order_id'),
          payment_id: searchParams.get('payment_id'),
          payhere_amount: searchParams.get('payhere_amount'),
          payhere_currency: searchParams.get('payhere_currency'),
          status_code: searchParams.get('status_code'),
          md5sig: searchParams.get('md5sig'),
          method: searchParams.get('method'),
          status_message: searchParams.get('status_message'),
          card_holder_name: searchParams.get('card_holder_name'),
          card_no: searchParams.get('card_no'),
          custom_1: searchParams.get('custom_1'),
          custom_2: searchParams.get('custom_2')
        };

        console.log('PayHere notification data received:', notificationData);

        // Check if we have required data
        if (!notificationData.merchant_id || !notificationData.order_id || !notificationData.status_code) {
          throw new Error('Invalid notification data received');
        }

        // Send notification data to backend for processing
        const response = await fetch('http://localhost:5555/payhere-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(notificationData).toString()
        });

        if (!response.ok) {
          throw new Error(`Backend processing failed: ${response.status}`);
        }

        const result = await response.text();
        console.log('Backend response:', result);

        // Handle different payment statuses
        const statusCode = notificationData.status_code;
        
        if (statusCode === '2') {
          setStatus('success');
          setMessage('Payment successful! Your subscription has been activated.');
          
          // Redirect to success page after 3 seconds
          setTimeout(() => {
            navigate(`/payment-success?plan=premium&orderId=${notificationData.order_id}`);
          }, 3000);
          
        } else if (statusCode === '0') {
          setStatus('pending');
          setMessage('Payment is pending. Please wait for confirmation.');
          
        } else if (statusCode === '-1') {
          setStatus('cancelled');
          setMessage('Payment was cancelled.');
          
          setTimeout(() => {
            navigate('/payment-cancel');
          }, 3000);
          
        } else if (statusCode === '-2') {
          setStatus('failed');
          setMessage('Payment failed. Please try again.');
          
          setTimeout(() => {
            navigate('/payment-cancel');
          }, 3000);
          
        } else if (statusCode === '-3') {
          setStatus('charged_back');
          setMessage('Payment was charged back.');
          
        } else {
          setStatus('unknown');
          setMessage(`Unknown payment status: ${statusCode}`);
        }

      } catch (error) {
        console.error('Error processing PayHere notification:', error);
        setStatus('error');
        setMessage(`Error processing payment: ${error.message}`);
        
        // Redirect to error page after 3 seconds
        setTimeout(() => {
          navigate('/subscription?error=notification_failed');
        }, 3000);
      }
    };

    processNotification();
  }, [searchParams, navigate]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return '✅';
      case 'pending':
        return '⏳';
      case 'cancelled':
        return '❌';
      case 'failed':
        return '❌';
      case 'error':
        return '⚠️';
      case 'processing':
        return '🔄';
      default:
        return '❓';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return '#28a745';
      case 'pending':
        return '#ffc107';
      case 'cancelled':
      case 'failed':
      case 'error':
        return '#dc3545';
      case 'processing':
        return '#007bff';
      default:
        return '#6c757d';
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f8f9fa',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        width: '90%'
      }}>
        <div style={{
          fontSize: '48px',
          marginBottom: '20px'
        }}>
          {getStatusIcon()}
        </div>
        
        <h2 style={{
          color: getStatusColor(),
          marginBottom: '20px',
          fontSize: '24px'
        }}>
          Payment Notification
        </h2>
        
        <p style={{
          color: '#666',
          fontSize: '16px',
          lineHeight: '1.5',
          marginBottom: '30px'
        }}>
          {message}
        </p>
        
        {status === 'processing' && (
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '20px auto'
          }}></div>
        )}
        
        {status !== 'processing' && status !== 'success' && (
          <button
            onClick={() => navigate('/subscription')}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to Subscription
          </button>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PayHereNotify;