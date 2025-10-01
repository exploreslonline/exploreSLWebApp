import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import Spinner from '../component/Spinner';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from "jspdf";

const ShowFeedback = () => {
  const navigate = useNavigate();
  const [feedbacklist, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState(null);
  const [updatedFeedback, setUpdatedFeedback] = useState({
    firstname: '',
    lastname: '',
    email: '',
    phonenumber: '',
    subject: '',
    message: '',
    rating: ''
  });
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = () => {
    setLoading(true);
    Axios.get('http://localhost:5555/feedback')
      .then((response) => {
        if (Array.isArray(response.data)) {
          setFeedbackList(response.data);
        } else {
          setFeedbackList([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.log("Fetch Error:", error);
        setLoading(false);
      });
  };

  const handleEdit = (feedback) => {
    setEditingFeedback(feedback);
    setUpdatedFeedback({
      firstname: feedback.firstname,
      lastname: feedback.lastname,
      email: feedback.email,
      phonenumber: feedback.phonenumber,
      subject: feedback.subject,
      message: feedback.message,
      rating: feedback.rating
    });
  };

  const handleUpdate = async () => {
    try {
      const response = await Axios.put(`http://localhost:5555/feedback/${editingFeedback._id}`, updatedFeedback);
      if (response.status === 200) {
        const updatedList = feedbacklist.map((feedback) =>
          feedback._id === editingFeedback._id ? { ...feedback, ...updatedFeedback } : feedback
        );
        setFeedbackList(updatedList);
        setEditingFeedback(null);
      } else {
        console.error("Failed to update feedback");
      }
    } catch (error) {
      console.error("Error updating feedback:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this feedback?")) {
      try {
        const response = await Axios.delete(`http://localhost:5555/feedback/${id}`);
        if (response.status === 200) {
          setFeedbackList(feedbacklist.filter((feedback) => feedback._id !== id));
        } else {
          console.error("Failed to delete feedback");
        }
      } catch (error) {
        console.error("Error deleting feedback:", error);
      }
    }
  };

  const generatePDF = () => {
    const input = document.getElementById("table-to-pdf");
    
    if (!input) {
      console.error("Element with ID 'table-to-pdf' not found!");
      return;
    }
  
    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a1', // Changed to A4 format, adjust if necessary
    });
  
    const rows = Array.from(input.querySelectorAll("tr"));
    const tableData = rows.map((row) =>
      Array.from(row.querySelectorAll("td, th")).map((cell) => cell.innerText)
    );
  
    let yOffset = 20; // Adjust starting position for content
    const margin = 10;
  
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Feedback Details", margin, yOffset);
    yOffset += 20;
  
    // Add table headers
    const headers = tableData[0];
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(76, 175, 80); // Table header color
    pdf.rect(margin, yOffset - 7, 500, 10, "F");
    pdf.setTextColor(255, 255, 255);
    headers.forEach((header, index) => {
      pdf.text(header, margin + 50 * index, yOffset);
    });
    yOffset += 10;
  
    // Add table rows
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    tableData.slice(1).forEach((row) => {
      row.forEach((cell, index) => {
        pdf.text(cell, margin + 50 * index, yOffset);
      });
      yOffset += 10;
  
      // Add page break if needed
      if (yOffset > 270) {
        pdf.addPage();
        yOffset = 20;
      }
    });
  
    pdf.save("feedback_details.pdf");
  };

  const handleCancel = () => {
    setEditingFeedback(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedFeedback((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Search filter logic
  const filteredFeedbacks = feedbacklist.filter(feedback => {
    return (
      feedback.firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.lastname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      feedback.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      background: "linear-gradient(135deg,rgb(106, 109, 153) 0%,rgb(255, 255, 255) 100%)",
      color: "#ffffff", // White text
      fontFamily: "Arial, sans-serif",
    },
    sidebar: {
      width: "250px",
      background: "#222",
      padding: "20px",
      boxShadow: "2px 0 10px rgba(0,0,0,0.2)",
      transition: "all 0.3s ease",
    },
    sidebarItem: {
      padding: "15px",
      margin: "10px 0",
      background: "#444",
      cursor: "pointer",
      borderRadius: "5px",
      textAlign: "center",
      transition: "background 0.3s ease",
      color: "#ffffff", // White text for sidebar items
    },
    mainContent: {
      flex: 1,
      padding: "40px",
      textAlign: "center",
      animation: "fadeIn 0.8s ease-in-out",
    },
    heading: {
      textAlign: 'center',
      color: '#ffffff',
      fontSize: '2rem',
      marginBottom: '20px',
    },
    tableContainer: {
      padding: '16px',
      maxWidth: 'auto',
      margin: 'auto',
      backgroundColor: '#1e1e1e', // Dark background for table container
      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.5)',
      borderRadius: '8px',
    },
    editHeading: {
      textAlign: 'center',
      color: '#ffffff',
      fontSize: '1.8rem',
      marginBottom: '20px',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginTop: '20px',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    th: {
      padding: '10px',
      backgroundColor: '#4CAF50',
      color: 'white',
      fontSize: '1.1rem',
    },
    td: {
      padding: '10px',
      textAlign: 'center',
      border: '1px solid #444', // Darker border
      color: '#ffffff', // White text for table data
    },
    editButton: {
      backgroundColor: '#4caf50',
      color: 'white',
      border: 'none',
      padding: '5px 10px',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'background-color 0.3s ease',
    },
    deleteButton: {
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      padding: '5px 10px',
      cursor: 'pointer',
      borderRadius: '4px',
      transition: 'background-color 0.3s ease',
    },
    saveButton: {
      backgroundColor: '#4CAF50',
      color: 'white',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '1rem',
      transition: 'background-color 0.3s ease',
    },
    cancelButton: {
      backgroundColor: '#ccc',
      color: 'black',
      padding: '10px 20px',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '1rem',
      marginLeft: '10px',
      transition: 'background-color 0.3s ease',
    },
    input: {
      padding: '10px',
      
      width: '100%',
      border: '1px solid #444', // Darker border for inputs
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#333', // Dark background for inputs
      color: '#ffffff', // White text for inputs
    },
    textarea: {
      padding: '10px',
      width: '100%',
      height: '150px',
      border: '1px solid #444', // Darker border for textarea
      borderRadius: '4px',
      marginBottom: '10px',
      backgroundColor: '#333', // Dark background for textarea
      color: '#ffffff', // White text for textarea
    },
    formGroup: {
      marginBottom: '20px',
    },
    buttonGroup: {
      textAlign: 'center',
    },
    noData: {
      textAlign: 'center',
      padding: '10px',
      fontSize: '1.2rem',
      color: '#777',
    },
    pdfButton: {
      backgroundColor: "#ff6b6b",
      color: "white",
      border: "none",
      padding: "12px 20px",
      borderRadius: "6px",
      fontSize: "1rem",
      cursor: "pointer",
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: "10px",
    },
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <h3>Admin Panel</h3>
        <div
          style={styles.sidebarItem}
          onClick={() => navigate("/admindashboard")}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Dashboard
        </div>
        <div
          style={styles.sidebarItem}
          onClick={() => navigate("/usershowpage")}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Users
        </div>
        <div
          style={styles.sidebarItem}
          onClick={() => navigate("/adminsignin")}
          onMouseEnter={(e) => (e.target.style.background = "#666")}
          onMouseLeave={(e) => (e.target.style.background = "#444")}
        >
          Logout
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <h1 style={styles.heading}>All Feedback Details</h1>
        <input
          type="text"
          placeholder="Search feedback..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={styles.input}
        />
        <button style={styles.pdfButton} onClick={generatePDF}>
          Generate PDF
        </button>
        {loading ? (
          <Spinner />
        ) : (
          <div style={styles.tableContainer}>
            {editingFeedback ? (
              <div>
                <h2 style={styles.editHeading}>Edit Feedback</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
                  <div style={styles.formGroup}>
                    <label>First Name:</label>
                    <input type="text" name="firstname" value={updatedFeedback.firstname} onChange={handleChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Last Name:</label>
                    <input type="text" name="lastname" value={updatedFeedback.lastname} onChange={handleChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Email:</label>
                    <input type="email" name="email" value={updatedFeedback.email} onChange={handleChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Phone Number:</label>
                    <input type="text" name="phonenumber" value={updatedFeedback.phonenumber} onChange={handleChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Subject:</label>
                    <input type="text" name="subject" value={updatedFeedback.subject} onChange={handleChange} style={styles.input} />
                  </div>
                  <div style={styles.formGroup}>
                    <label>Message:</label>
                    <textarea name="message" value={updatedFeedback.message} onChange={handleChange} style={styles.textarea}></textarea>
                  </div>
                  <div style={styles.formGroup}>
                    <label>Rating:</label>
                    <input type="text" name="rating" value={updatedFeedback.rating} onChange={handleChange} style={styles.input} />
                  </div>
                  <div style={styles.buttonGroup}>
                    <button type="submit" style={styles.saveButton}>Save</button>
                    <button type="button" onClick={handleCancel} style={styles.cancelButton}>Cancel</button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                {filteredFeedbacks.length === 0 ? (
                  <p style={styles.noData}>No feedback found matching your search criteria.</p>
                ) : (
                  <table style={styles.table} id="table-to-pdf">
                    <thead>
                      <tr>
                        <th style={styles.th}>First Name</th>
                        <th style={styles.th}>Last Name</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Message</th>
                        <th style={styles.th}>Rating</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredFeedbacks.map((feedback) => (
                        <tr key={feedback._id}>
                          <td style={styles.td}>{feedback.firstname}</td>
                          <td style={styles.td}>{feedback.lastname}</td>
                          <td style={styles.td}>{feedback.email}</td>
                          <td style={styles.td}>{feedback.subject}</td>
                          <td style={styles.td}>{feedback.message}</td>
                          <td style={styles.td}>{feedback.rating}</td>
                          <td style={styles.td}>
                            <button
                              style={styles.editButton}
                              onClick={() => handleEdit(feedback)}
                            >
                              Edit
                            </button>
                            <button
                              style={styles.deleteButton}
                              onClick={() => handleDelete(feedback._id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowFeedback;
