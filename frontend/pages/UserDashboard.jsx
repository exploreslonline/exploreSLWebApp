import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserDashboard.css';

const UserDashboard = () => {
  const [user, setUser] = useState(null);
  const [contactusList, setContactList] = useState([]);
  const [feedbackList, setFeedbackList] = useState([]);
  const [paymentList, setPaymentList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [contactEditData, setContactEditData] = useState(null); 
  const [feedbackEditData, setFeedbackEditData] = useState(null); 
  const [paymentEditData, setPaymentEditData] = useState(null); 
  const [editMode, setEditMode] = useState(false); 
  const navigate = useNavigate();

  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");

    if (!storedEmail) {
      navigate("/signin");
      return;
    }

    setUser(storedEmail);
    fetchContactUsDetails(storedEmail);
    fetchFeedbacks(storedEmail);
    fetchPayments(storedEmail);
  }, []);

  const fetchContactUsDetails = (storedEmail) => {
    Axios.get('http://localhost:5555/contact')
      .then((response) => {
        const userContactForms = response.data.filter((contact) => contact.email === storedEmail);
        setContactList(userContactForms);
      })
      .catch((error) => {
        console.error("Error fetching contact details:", error);
      });
  };

  const fetchFeedbacks = (storedEmail) => {
    setLoading(true);
    Axios.get('http://localhost:5555/feedback')
      .then((response) => {
        const userFeedbacks = response.data.filter((feedback) => feedback.email === storedEmail);
        setFeedbackList(userFeedbacks);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching feedback details:", error);
        setLoading(false);
      });
  };

  const fetchPayments = (storedEmail) => {
    setLoading(true);
    Axios.get('http://localhost:5555/payment')
      .then((response) => {
        const userPayments = response.data.filter((payment) => payment.email === storedEmail);
        setPaymentList(userPayments);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching payment details:", error);
        setLoading(false);
      });
  };

  const handleDeleteContact = async (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        const response = await Axios.delete(`http://localhost:5555/contact/${id}`);
        if (response.status === 200) {
          setContactList(contactusList.filter((contact) => contact._id !== id));
        } else {
          console.error("Failed to delete contact");
        }
      } catch (error) {
        console.error("Error deleting contact:", error);
      }
    }
  };

  const handleDeleteFeedback = async (id) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      try {
        const response = await Axios.delete(`http://localhost:5555/feedback/${id}`);
        if (response.status === 200) {
          setFeedbackList(feedbackList.filter((feedback) => feedback._id !== id));
        } else {
          console.error("Failed to delete feedback");
        }
      } catch (error) {
        console.error("Error deleting feedback:", error);
      }
    }
  };

  const handleDeletePayment = async (id) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        const response = await Axios.delete(`http://localhost:5555/payment/${id}`);
        if (response.status === 200) {
          setPaymentList(paymentList.filter((payment) => payment._id !== id));
        } else {
          console.error("Failed to delete payment");
        }
      } catch (error) {
        console.error("Error deleting payment:", error);
      }
    }
  };

  const handleEditContact = (contact) => {
    setContactEditData(contact);
    setEditMode(true);
  };

  const handleEditFeedback = (feedback) => {
    setFeedbackEditData(feedback);
    setEditMode(true);
  };

  const handleEditPayment = (payment) => {
    setPaymentEditData(payment);
    setEditMode(true);
  };

  const handleUpdateContact = async () => {
    try {
      const response = await Axios.put(`http://localhost:5555/contact/${contactEditData._id}`, contactEditData);
      if (response.status === 200) {
        setContactList(contactusList.map((contact) => (contact._id === contactEditData._id ? contactEditData : contact)));
        setEditMode(false);
        setContactEditData(null);
      }
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleUpdateFeedback = async () => {
    try {
      const response = await Axios.put(`http://localhost:5555/feedback/${feedbackEditData._id}`, feedbackEditData);
      if (response.status === 200) {
        setFeedbackList(feedbackList.map((feedback) => (feedback._id === feedbackEditData._id ? feedbackEditData : feedback)));
        setEditMode(false);
        setFeedbackEditData(null);
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
  };

  const handleUpdatePayment = async () => {
    try {
      const response = await Axios.put(`http://localhost:5555/payment/${paymentEditData._id}`, paymentEditData);
      if (response.status === 200) {
        setPaymentList(paymentList.map((payment) => (payment._id === paymentEditData._id ? paymentEditData : payment)));
        setEditMode(false);
        setPaymentEditData(null);
      }
    } catch (error) {
      console.error("Error updating payment:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setContactEditData(null);
    setFeedbackEditData(null);
    setPaymentEditData(null);
  };

  return (
    <div className="user-dashboard">
      <h2 className="dashboard-title">User Dashboard</h2>
      {user ? (
        <>
          <p className="welcome-text">Welcome, {user}</p>

          {/* Contact Us Section */}
          <h3 className="section-title">Your Contact Us Form Submissions</h3>
          {contactusList.length > 0 ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contactusList.map((contact) => (
                  <tr key={contact._id}>
                    <td>{contact._id}</td>
                    <td>{contact.name}</td>
                    <td>{contact.email}</td>
                    <td>{contact.phone}</td>
                    <td>{contact.subject}</td>
                    <td>{contact.message}</td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEditContact(contact)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDeleteContact(contact._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No contact submissions found.</p>
          )}

          {/* Feedback Section */}
          <h3 className="section-title">Your Feedbacks</h3>
          {loading ? (
            <p>Loading feedbacks...</p>
          ) : feedbackList.length > 0 ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>First Name</th>
                  <th>Last Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Subject</th>
                  <th>Message</th>
                  <th>Rating</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feedbackList.map((feedback) => (
                  <tr key={feedback._id}>
                    <td>{feedback._id}</td>
                    <td>{feedback.firstname}</td>
                    <td>{feedback.lastname}</td>
                    <td>{feedback.email}</td>
                    <td>{feedback.phonenumber}</td>
                    <td>{feedback.subject}</td>
                    <td>{feedback.message}</td>
                    <td>{feedback.rating}</td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEditFeedback(feedback)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDeleteFeedback(feedback._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No feedback found.</p>
          )}

          {/* Payment Section */}
          <h3 className="section-title">Your Payment Details</h3>
          {loading ? (
            <p>Loading payment details...</p>
          ) : paymentList.length > 0 ? (
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone Number</th>
                  <th>Selected Package</th>
                  <th>Persons</th>
                  <th>From Date</th>
                  <th>To Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paymentList.map((payment) => (
                  <tr key={payment._id}>
                    <td>{payment._id}</td>
                    <td>{payment.name}</td>
                    <td>{payment.email}</td>
                    <td>{payment.phoneNumber}</td>
                    <td>{payment.selectedPackage}</td>
                    <td>{payment.persons}</td>
                    <td>{payment.fromDate}</td>
                    <td>{payment.toDate}</td>
                    <td>
                      <button className="edit-btn" onClick={() => handleEditPayment(payment)}>Edit</button>
                      <button className="delete-btn" onClick={() => handleDeletePayment(payment._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No payment details found.</p>
          )}

          {/* Separate Edit Forms */}
          {editMode && (
            <>
              {contactEditData && (
                <div className="edit-modal">
                  <h3>Edit Contact Form</h3>
                  <div className="edit-form">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={contactEditData.name}
                      onChange={(e) => setContactEditData({ ...contactEditData, name: e.target.value })}
                    />
                    <label>Email:</label>
                    <input
                      type="email"
                      value={contactEditData.email}
                      onChange={(e) => setContactEditData({ ...contactEditData, email: e.target.value })}
                    />
                    <label>Phone Number:</label>
                    <input
                      type="text"
                      value={contactEditData.phone}
                      onChange={(e) => setContactEditData({ ...contactEditData, phone: e.target.value })}
                    />
                    <label>Subject:</label>
                    <input
                      type="text"
                      value={contactEditData.subject}
                      onChange={(e) => setContactEditData({ ...contactEditData, subject: e.target.value })}
                    />
                    <label>Message:</label>
                    <textarea
                      value={contactEditData.message}
                      onChange={(e) => setContactEditData({ ...contactEditData, message: e.target.value })}
                    />
                    <div className="form-buttons">
                      <button className="save-btn" onClick={handleUpdateContact}>Save Changes</button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {feedbackEditData && (
                <div className="edit-modal">
                  <h3>Edit Feedback</h3>
                  <div className="edit-form">
                    <label>First Name:</label>
                    <input
                      type="text"
                      value={feedbackEditData.firstname}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, firstname: e.target.value })}
                    />
                    <label>Last Name:</label>
                    <input
                      type="text"
                      value={feedbackEditData.lastname}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, lastname: e.target.value })}
                    />
                    <label>Email:</label>
                    <input
                      type="email"
                      value={feedbackEditData.email}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, email: e.target.value })}
                    />
                    <label>Phone:</label>
                    <input
                      type="text"
                      value={feedbackEditData.phonenumber}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, phonenumber: e.target.value })}
                    />
                    <label>Subject:</label>
                    <input
                      type="text"
                      value={feedbackEditData.subject}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, subject: e.target.value })}
                    />
                    <label>Message:</label>
                    <textarea
                      value={feedbackEditData.message}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, message: e.target.value })}
                    />
                    <label>Rating:</label>
                    <input
                      type="number"
                      value={feedbackEditData.rating}
                      onChange={(e) => setFeedbackEditData({ ...feedbackEditData, rating: e.target.value })}
                    />
                    <div className="form-buttons">
                      <button className="save-btn" onClick={handleUpdateFeedback}>Save Changes</button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
              {paymentEditData && (
                <div className="edit-modal">
                  <h3>Edit Payment Details</h3>
                  <div className="edit-form">
                    <label>Name:</label>
                    <input
                      type="text"
                      value={paymentEditData.name}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, name: e.target.value })}
                    />
                    <label>Email:</label>
                    <input
                      type="email"
                      value={paymentEditData.email}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, email: e.target.value })}
                    />
                    <label>Phone Number:</label>
                    <input
                      type="text"
                      value={paymentEditData.phoneNumber}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, phoneNumber: e.target.value })}
                    />
                    <label>Package:</label>
                    <input
                      type="text"
                      value={paymentEditData.selectedPackage}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, selectedPackage: e.target.value })}
                    />
                    <label>Persons:</label>
                    <input
                      type="number"
                      value={paymentEditData.persons}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, persons: e.target.value })}
                    />
                    <label>From Date:</label>
                    <input
                      type="date"
                      value={paymentEditData.fromDate}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, fromDate: e.target.value })}
                    />
                    <label>To Date:</label>
                    <input
                      type="date"
                      value={paymentEditData.toDate}
                      onChange={(e) => setPaymentEditData({ ...paymentEditData, toDate: e.target.value })}
                    />
                    <div className="form-buttons">
                      <button className="save-btn" onClick={handleUpdatePayment}>Save Changes</button>
                      <button className="cancel-btn" onClick={handleCancelEdit}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <p>Loading user data...</p>
      )}
    </div>
  );
};

export default UserDashboard;
