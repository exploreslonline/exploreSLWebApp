import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    navigate('/subscription');
  };

  const handleGoHome = () => {
    navigate('/usershowpage'); // or wherever your main page is
  };

  return (
    <div style={{ 
      textAlign: 'center', 
      padding: '50px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '600px',
      margin: '0 auto'
    }}>
      <div style={{ color: '#ffc107', fontSize: '48px', marginBottom: '20px' }}>
        ⚠️
      </div>
      
      <h1 style={{ color: '#dc3545', marginBottom: '20px' }}>
        Payment Cancelled
      </h1>
      
      <div style={{ marginBottom: '30px', fontSize: '18px', lineHeight: '1.6' }}>
        Your payment has been cancelled. No charges were made to your account.
      </div>
      
      <div style={{ marginBottom: '40px', fontSize: '14px', color: '#666' }}>
        If you cancelled by mistake, you can try again. If you're experiencing issues, 
        please contact our support team.
      </div>
      
      <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={handleRetry}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Try Again
        </button>
        
        <button
          onClick={handleGoHome}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            padding: '15px 30px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Go to Dashboard
        </button>
      </div>
      
      <div style={{ marginTop: '40px', fontSize: '12px', color: '#999' }}>
        Need help? Contact us at support@yourcompany.com
      </div>
    </div>
  );
};

export default PaymentCancel;