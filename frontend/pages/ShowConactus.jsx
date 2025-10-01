import React, { useEffect, useState } from 'react';
import Axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Spinner from '../component/Spinner';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas'; // Import html2canvas

const ShowContactUs = () => {
  const navigate = useNavigate();
  const [contactusList, setContactList] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [updatedContact, setUpdatedContact] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  // Fetch contacts on component mount
  useEffect(() => {
    fetchContacts();
  }, []);

  // Update filtered contacts whenever search term, filter field, or contact list changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredContacts(contactusList);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = contactusList.filter(contact => {
        if (filterField === 'all') {
          return (
            (contact.name && contact.name.toLowerCase().includes(term)) ||
            (contact.email && contact.email.toLowerCase().includes(term)) ||
            (contact.subject && contact.subject.toLowerCase().includes(term)) ||
            (contact.message && contact.message.toLowerCase().includes(term))
          );
        } else {
          return contact[filterField] && 
                 contact[filterField].toString().toLowerCase().includes(term);
        }
      });
      setFilteredContacts(filtered);
    }
  }, [searchTerm, filterField, contactusList]);

  const fetchContacts = () => {
    setLoading(true);
    Axios.get('http://localhost:5555/contact')
      .then((response) => {
        if (Array.isArray(response.data)) {
          setContactList(response.data);
          setFilteredContacts(response.data);
        } else {
          setContactList([]);
          setFilteredContacts([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.log("Fetch Error:", error);
        setLoading(false);
      });
  };

  const handleEdit = (contact) => {
    setEditingContact(contact);
    setUpdatedContact({
      name: contact.name || '',
      email: contact.email || '',
      phone: contact.phone || '',
      subject: contact.subject || '',
      message: contact.message || ''
    });
  };

  const handleUpdate = async () => {
    try {
      const response = await Axios.put(`http://localhost:5555/contact/${editingContact._id}`, updatedContact);
      if (response.status === 200) {
        const updatedList = contactusList.map((contact) =>
          contact._id === editingContact._id ? { ...contact, ...updatedContact } : contact
        );
        setContactList(updatedList);
        setEditingContact(null);
      } else {
        console.error("Failed to update contact");
      }
    } catch (error) {
      console.error("Error updating contact:", error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        const response = await Axios.delete(`http://localhost:5555/contact/${id}`);
        if (response.status === 200) {
          const updatedList = contactusList.filter((contact) => contact._id !== id);
          setContactList(updatedList);
          setFilteredContacts(updatedList); // Update filtered contacts as well
        } else {
          console.error("Failed to delete contact");
        }
      } catch (error) {
        console.error("Error deleting contact:", error);
      }
    }
  };

  const handleCancel = () => {
    setEditingContact(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUpdatedContact((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilterField(e.target.value);
  };

   
  
  const generatePDF = () => {
    const input = document.getElementById("table-to-pdf");
  
    if (!input) {
      console.error("Element with ID 'table-to-pdf' not found!");
      return;
    }
  
    const pdf = new jsPDF({
      unit: 'mm', // Measurement units in millimeters
      format: 'a1', // Page size A4
    });
  
    // Extracting the table data
    const rows = Array.from(input.querySelectorAll("tr"));
    const tableData = rows.map(row => {
      return Array.from(row.querySelectorAll("td, th")).map(cell => cell.innerText);
    });
  
    // Set the starting point for the table
    let yOffset = 10;
    const margin = 10;
  
    // Add title to the PDF
    pdf.setFontSize(16);
    pdf.setFont("helvetica", "bold");
    pdf.text("Contact Us Details", margin, yOffset);
    yOffset += 20;
  
    // Add table headers with improved styling
    const headers = tableData[0]; // The first row as headers
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFillColor(76, 175, 80); // Green color for the header background
    pdf.rect(margin, yOffset - 8, 500, 10, "F"); // Header background color
    pdf.setTextColor(255, 255, 255); // White text for headers
    pdf.text(headers[0], margin + 5, yOffset);
    pdf.text(headers[1], margin + 80, yOffset);
    pdf.text(headers[2], margin + 140, yOffset);
    pdf.text(headers[3], margin + 220, yOffset);
    pdf.text(headers[4], margin + 300, yOffset);
    pdf.text(headers[5], margin + 360, yOffset);
    yOffset += 10;
  
    // Add table rows with better formatting
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0); // Reset text color to black
  
    // Loop through rows (skipping the header row)
    tableData.slice(1).forEach(row => {
      pdf.rect(margin, yOffset, 500, 10); // Cell border
      pdf.text(row[0], margin + 5, yOffset + 6); // ID
      pdf.text(row[1], margin + 80, yOffset + 6); // Name
      pdf.text(row[2], margin + 140, yOffset + 6); // Email
      pdf.text(row[3], margin + 220, yOffset + 6); // Phone
      pdf.text(row[4], margin + 300, yOffset + 6); // Subject
      pdf.text(row[5], margin + 360, yOffset + 6);
      yOffset += 10;
    });
  
    // Add page break if content is too long
    if (yOffset > 270) {
      pdf.addPage();
      yOffset = 10;
    }
  
    // Save the generated PDF
    pdf.save("contact_us_details.pdf");
  };
  
  
  
  
  

  

  // Enhanced styles with animations and improved aesthetics
  const styles = {
    container: {
      display: "flex",
      minHeight: "100vh",
      background: "linear-gradient(135deg,rgb(106, 109, 153) 0%,rgb(255, 255, 255) 100%)",
      color: "#ffffff",
      fontFamily: "'Poppins', Arial, sans-serif",
    },
    sidebar: {
      width: "250px",
      background: "linear-gradient(180deg, #1e1e1e 0%, #252525 100%)",
      padding: "20px",
      boxShadow: "2px 0 15px rgba(0,0,0,0.7)",
      transition: "all 0.3s ease",
      display: "flex",
      flexDirection: "column",
      position: "relative",
      zIndex: "1",
    },
    sidebarHeader: {
      marginBottom: "30px",
      textAlign: "center",
      borderBottom: "1px solid #333",
      paddingBottom: "15px",
    },
    sidebarItem: {
      padding: "15px",
      margin: "8px 0",
      background: "rgba(51, 51, 51, 0.7)",
      cursor: "pointer",
      borderRadius: "8px",
      textAlign: "center",
      transition: "all 0.3s ease",
      color: "#ffffff",
      boxShadow: "0 2px 5px rgba(0,0,0,0.3)",
      border: "1px solid #444",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    activeItem: {
      background: "#4CAF50",
      color: "white",
      boxShadow: "0 4px 10px rgba(76, 175, 80, 0.3)",
    },
    mainContent: {
      flex: 1,
      padding: "40px",
      textAlign: "center",
      overflow: "auto",
    },
    header: {
      marginBottom: "30px",
      position: "relative",
    },
    searchContainer: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "20px",
      flexWrap: "wrap",
      gap: "15px",
    },
    searchInput: {
      flex: "1",
      padding: "12px 15px",
      borderRadius: "6px",
      border: "none",
      background: "#333",
      color: "#fff",
      fontSize: "1rem",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
      minWidth: "200px",
    },
    selectFilter: {
      padding: "12px 15px",
      borderRadius: "6px",
      border: "none",
      background: "#333",
      color: "#fff",
      fontSize: "1rem",
      marginLeft: "10px",
      cursor: "pointer",
      boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
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
    tableContainer: {
     padding: '20px',
      maxWidth: 'auto',
      margin: 'auto',
      backgroundColor: 'rgba(30, 30, 30, 0.8)',
      boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.5)',
      borderRadius: '12px',
    },
    table: {
      width: '100%',
      borderCollapse: 'separate',
      borderSpacing: '0',
      marginTop: '20px',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    th: {
      padding: '15px',
      backgroundColor: '#4CAF50',
      color: 'white',
      fontSize: '1.1rem',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      letterSpacing: '1px',
      position: 'sticky',
      top: '0',
      zIndex: '10',
    },
    td: {
      padding: '12px',
      textAlign: 'center',
      borderBottom: '1px solid #444',
      color: '#ffffff',
      fontSize: '1rem',
      verticalAlign: 'middle',
    },
    tr: {
      transition: 'background-color 0.2s ease',
    },
    trHover: {
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    editButton: {
      backgroundColor: '#4caf50',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      cursor: 'pointer',
      borderRadius: '4px',
      marginRight: '8px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontSize: '0.9rem',
    },
    deleteButton: {
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      cursor: 'pointer',
      borderRadius: '4px',
      boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
      fontSize: '0.9rem',
    },
    noData: {
      textAlign: 'center',
      padding: '30px',
      fontSize: '1.2rem',
      color: '#aaa',
      backgroundColor: 'rgba(0,0,0,0.2)',
      borderRadius: '8px',
      margin: '20px 0',
    },
    formContainer: {
      margin: '20px auto',
      maxWidth: '600px',
      backgroundColor: 'rgba(40, 40, 40, 0.9)',
      padding: '25px',
      borderRadius: '12px',
      boxShadow: '0 8px 20px rgba(0, 0, 0, 0.6)',
      border: '1px solid #444',
    },
    formTitle: {
      fontSize: '1.5rem',
      marginBottom: '20px',
      position: 'relative',
      paddingBottom: '10px',
      borderBottom: '2px solid #4CAF50',
    },
    formGroup: {
      marginBottom: '20px',
      textAlign: 'left',
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontSize: '1rem',
      color: '#ccc',
    },
    input: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#333',
      border: '1px solid #555',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '1rem',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      backgroundColor: '#333',
      border: '1px solid #555',
      borderRadius: '6px',
      color: '#fff',
      fontSize: '1rem',
      minHeight: '120px',
      resize: 'vertical',
    },
    buttonGroup: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '15px',
      marginTop: '25px',
    },
    saveButton: {
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '1rem',
    },
    cancelButton: {
      backgroundColor: '#777',
      color: 'white',
      border: 'none',
      padding: '10px 20px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '1rem',
    },
  };

  return (
    <div style={styles.container}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3>Admin Panel</h3>
        </div>
        <div 
          style={{
            ...styles.sidebarItem,
            backgroundColor: window.location.pathname === "/admindashboard" ? "#4CAF50" : "rgba(51, 51, 51, 0.7)"
          }} 
          onClick={() => navigate("/admindashboard")}
        >
          Dashboard
        </div>
        <div 
          style={{
            ...styles.sidebarItem,
            backgroundColor: window.location.pathname === "/usershowpage" ? "#4CAF50" : "rgba(51, 51, 51, 0.7)"
          }} 
          onClick={() => navigate("/usershowpage")}
        >
          Users
        </div>
        
        <div style={styles.sidebarItem} onClick={() => navigate("/adminsignin")}>
          Logout
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        <h1 style={styles.header}>Contact Requests Management</h1>
        
        {loading ? (
          <Spinner />
        ) : (
          <div style={styles.tableContainer}>
            {editingContact ? (
              <div style={styles.formContainer}>
                <h2 style={styles.formTitle}>Edit Contact Details</h2>
                <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Name:</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={updatedContact.name} 
                      onChange={handleChange} 
                      style={styles.input} 
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email:</label>
                    <input 
                      type="email" 
                      name="email" 
                      value={updatedContact.email} 
                      onChange={handleChange} 
                      style={styles.input} 
                      required
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Phone:</label>
                    <input 
                      type="text" 
                      name="phone" 
                      value={updatedContact.phone} 
                      onChange={handleChange} 
                      style={styles.input} 
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Subject:</label>
                    <input 
                      type="text" 
                      name="subject" 
                      value={updatedContact.subject} 
                      onChange={handleChange} 
                      style={styles.input} 
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Message:</label>
                    <textarea 
                      name="message" 
                      value={updatedContact.message} 
                      onChange={handleChange} 
                      style={styles.textarea} 
                    />
                  </div>
                  <div style={styles.buttonGroup}>
                    <button type="button" onClick={handleCancel} style={styles.cancelButton}>
                      Cancel
                    </button>
                    <button type="submit" style={styles.saveButton}>
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div style={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    style={styles.searchInput}
                  />
                  <select 
                    value={filterField} 
                    onChange={handleFilterChange}
                    style={styles.selectFilter}
                  >
                    <option value="all">All Fields</option>
                    <option value="name">Name</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="subject">Subject</option>
                    <option value="message">Message</option>
                  </select>
                  <button onClick={generatePDF} style={styles.pdfButton}>
                    Generate PDF Report
                  </button>
                </div>
                
                <div id="table-to-pdf"> {/* Add an ID to the table container */}
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>ID</th>
                        <th style={styles.th}>Name</th>
                        <th style={styles.th}>Email</th>
                        <th style={styles.th}>Phone</th>
                        <th style={styles.th}>Subject</th>
                        <th style={styles.th}>Message</th>
                        <th style={styles.th}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((contactus) => (
                          <tr 
                            key={contactus._id} 
                            style={styles.tr}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(76, 175, 80, 0.1)';
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = '';
                            }}
                          >
                            <td style={styles.td}>{contactus._id}</td>
                            <td style={styles.td}>{contactus.name}</td>
                            <td style={styles.td}>{contactus.email}</td>
                            <td style={styles.td}>{contactus.phone}</td>
                            <td style={styles.td}>{contactus.subject}</td>
                            <td style={styles.td}>{contactus.message}</td>
                            <td style={styles.td}>
                              <button 
                                onClick={() => handleEdit(contactus)} 
                                style={styles.editButton}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#388e3c';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#4caf50';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                Edit
                              </button>
                              <button 
                                onClick={() => handleDelete(contactus._id)} 
                                style={styles.deleteButton}
                                onMouseOver={(e) => {
                                  e.currentTarget.style.backgroundColor = '#d32f2f';
                                  e.currentTarget.style.transform = 'translateY(-2px)';
                                }}
                                onMouseOut={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f44336';
                                  e.currentTarget.style.transform = 'translateY(0)';
                                }}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={styles.noData}>
                            {searchTerm ? 'No matching contacts found' : 'No contact details found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowContactUs;