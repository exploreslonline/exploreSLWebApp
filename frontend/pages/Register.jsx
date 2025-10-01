import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [address, setAddress] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessRegNo, setBusinessRegNo] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [userType, setUserType] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showTermsPopup, setShowTermsPopup] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const navigate = useNavigate();

  // Validation functions
  const validateName = (name, fieldName) => {
    if (!name.trim()) return `${fieldName} is required`;
    if (name.trim().length < 2) return `${fieldName} must be at least 2 characters`;
    if (!/^[a-zA-Z\s]+$/.test(name)) return `${fieldName} must contain only letters`;
    return "";
  };

  const validateAddress = (address) => {
    if (!address.trim()) return "Address is required";
    if (address.trim().length < 10) return "Address must be at least 10 characters";
    return "";
  };

  const validateEmail = (email) => {
    if (!email.trim()) return "Email is required";
    if (!email.includes('@')) return "Email must contain @ symbol";
    if (!email.endsWith('.com')) return "Email must end with .com";
    return "";
  };

  const validatePhone = (phone) => {
    if (!phone.trim()) return "Phone number is required";
    if (!/^\d+$/.test(phone)) return "Phone number must contain only digits";
    if (phone.length < 10) return "Phone number must be at least 10 digits";
    return "";
  };

  const validateBusinessName = (businessName) => {
    if (!businessName.trim()) return "Business name is required";
    if (businessName.trim().length < 3) return "Business name must be at least 3 characters";
    return "";
  };

  const validateBusinessRegNo = (businessRegNo) => {
    if (!businessRegNo.trim()) return "Business registration number is required";
    if (businessRegNo.trim().length < 3) return "Business registration number must be at least 3 characters";
    return "";
  };

  const validateBusinessAddress = (businessAddress) => {
    if (!businessAddress.trim()) return "Business address is required";
    if (businessAddress.trim().length < 10) return "Business address must be at least 10 characters";
    return "";
  };

  const validateUserType = (userType) => {
    if (!userType) return "User type is required";
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) return "Password must contain both uppercase and lowercase letters";
    if (!/(?=.*\d)/.test(password)) return "Password must contain at least one number";
    return "";
  };

  const validateConfirmPassword = (confirmPassword, password) => {
    if (!confirmPassword) return "Please confirm your password";
    if (confirmPassword !== password) return "Passwords do not match";
    return "";
  };

  // Real-time validation function
  const validateField = (fieldName, value) => {
    let errorMessage = "";
    
    switch (fieldName) {
      case "firstName":
        errorMessage = validateName(value, "First name");
        break;
      case "lastName":
        errorMessage = validateName(value, "Last name");
        break;
      case "address":
        errorMessage = validateAddress(value);
        break;
      case "email":
        errorMessage = validateEmail(value);
        break;
      case "phone":
        errorMessage = validatePhone(value);
        break;
      case "businessName":
        errorMessage = validateBusinessName(value);
        break;
      case "businessRegNo":
        errorMessage = validateBusinessRegNo(value);
        break;
      case "businessAddress":
        errorMessage = validateBusinessAddress(value);
        break;
      case "userType":
        errorMessage = validateUserType(value);
        break;
      case "password":
        errorMessage = validatePassword(value);
        break;
      case "confirmPassword":
        errorMessage = validateConfirmPassword(value, password);
        break;
      default:
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));

    return errorMessage === "";
  };

  // Handle input changes with validation
  const handleInputChange = (fieldName, value, setter) => {
    setter(value);
    validateField(fieldName, value);
    
    // Clear general error if field becomes valid
    if (validateField(fieldName, value)) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate all fields before submission
    const validations = {
      firstName: validateName(firstName, "First name"),
      lastName: validateName(lastName, "Last name"),
      address: validateAddress(address),
      email: validateEmail(email),
      phone: validatePhone(phone),
      businessName: validateBusinessName(businessName),
      businessRegNo: validateBusinessRegNo(businessRegNo),
      businessAddress: validateBusinessAddress(businessAddress),
      userType: validateUserType(userType),
      password: validatePassword(password),
      confirmPassword: validateConfirmPassword(confirmPassword, password)
    };

    setFieldErrors(validations);

    // Check if any field has errors
    const hasErrors = Object.values(validations).some(error => error !== "");
    
    if (hasErrors) {
      setError("Please fix all validation errors before submitting");
      return;
    }

    // Check if terms are accepted
    if (!termsAccepted) {
      setError("You must accept the Terms & Conditions to register!");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5555/api/auth/register", {
        firstName,
        lastName,
        address,
        email,
        phone,
        businessName,
        businessRegNo,
        businessAddress,
        userType,
        password,
        termsAccepted
      });

      if (response.data.success) {
        alert(
          "🎉 Registration Successful!\n\n" +
          "✅ Your account has been created and approved\n" +
          "📧 Welcome email sent to " + email + "\n" +
          "🔑 Please check your email for details\n\n" +
          "⚠️ IMPORTANT: Your account is currently non-activated.\n" +
          "After signing in, you must choose a subscription plan (Free or Premium) to access the platform features."
        );
        navigate("/signin");
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error("Registration Error:", error);

      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
        setError("Unable to connect to server. Please check your internet connection and try again.");
      } else {
        setError("Registration failed. Please try again later.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTermsClick = () => {
    setShowTermsPopup(true);
  };

  const closeTermsPopup = () => {
    setShowTermsPopup(false);
  };

  const acceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsPopup(false);
    setError("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.background}></div>

      {/* Terms & Conditions Popup */}
      {showTermsPopup && (
        <div style={styles.popupOverlay}>
          <div style={styles.popupContent}>
            <div style={styles.popupHeader}>
              <h2 style={styles.popupTitle}>Terms & Conditions</h2>
              <button style={styles.closeButton} onClick={closeTermsPopup}>×</button>
            </div>
            <div style={styles.termsContent}>
              <h3>Explore Sri Lanka operated by Sixt5 Pvt Ltd.</h3>
              <p><strong>Effective Date:</strong> 12 August 2025</p>

              <p>Please read these Terms & Conditions ("Terms") carefully. These Terms govern your access to and use of the mobile application known as Explore Sri Lanka, its associated web application, and related services, all of which are owned and operated by Sixt5 Pvt Ltd ("we", "us", "our", or "the Service"). By registering, accessing, or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.</p>

              <h4>1. Scope</h4>
              <p>These Terms apply to everyone who uses the Service, including individual public users, business users, advertisers, guests, and visitors. The Service is operated principally for users in Sri Lanka but is accessible internationally.</p>

              <h4>2. Information We Collect</h4>
              <p><strong>A. Public (individual) users</strong></p>
              <ul>
                <li>Contact details you provide (name, email, phone, profile details).</li>
                <li>Content you post, upload or share (text, images, audio, video).</li>
                <li>Device and usage data (device type, OS, IP address, log files, cookies, analytics)</li>
              </ul>

              <p><strong>B. Business users (registration & verification)</strong></p>
              <ul>
                <li>Business name, trading name, registered address, registration number, contact person and contact details.</li>
                <li>Verification documents (e.g., certificate of incorporation, tax registration, identity documents of authorised representatives) when required for validation</li>
              </ul>

              <h4>3. How We Use Data</h4>
              <p>We use collected data to:</p>
              <ul>
                <li>Provide and improve the Service, authenticate and verify business accounts, process transactions and provide customer support.</li>
                <li>Detect, prevent, and respond to fraud, abuse, security incidents and other prohibited behaviour.</li>
                <li>Comply with legal obligations and public authority requests.</li>
                <li>Communicate with you about updates, offers, and service changes (where lawful)</li>
              </ul>

              <h4>4. Data Protection & Cross‑Border Processing</h4>
              <p>We are committed to protecting personal data. Where we process personal data we will comply with applicable data protection laws and related guidance. Business users and public users located in Sri Lanka are subject to Sri Lanka's data protection framework.</p>

              <h4>5. Business Registration & Verification</h4>
              <p>Business users must submit accurate business details and any requested documentation for verification. We may verify business information against third‑party and public records.</p>

              <h4>6. Community Guidelines & Prohibited Content</h4>
              <p>To keep the platform safe and lawful you must not use the Service to post, upload, host, transmit or otherwise make available any content that is illegal, threatening, abusive, harassing, hateful, discriminatory or promotes violence.</p>

              <h4>7. AI, Automation, Bots, Hacking & Cybersecurity</h4>
              <p>Strictly prohibited: Using automated tools, bots, scripts or other software to register, post, scrape, spam, manipulate rankings, or otherwise access the Service without our prior written permission.</p>

              <h4>8. Advertising, Listings & Publisher Responsibility</h4>
              <p>If you publish advertisements, offers, listings or other promotional content on the Service, you represent and warrant that you own or have the necessary rights and permissions to publish that content.</p>

              <h4>9. Enforcement & Penalties</h4>
              <p>We may, at our sole discretion, temporarily suspend, permanently disable, or remove your account and content for violations of these Terms.</p>

              <h4>10. Governing Law & Jurisdiction</h4>
              <p>These Terms are governed by the laws of Sri Lanka. We and you submit to the exclusive jurisdiction of the courts of Sri Lanka for disputes connected with these Terms.</p>

              <h4>11. Contact Information</h4>
              <p>If you have questions, want to exercise your data subject rights, or wish to report a violation, contact us at: <strong>info@sixt5technology.xyz</strong></p>

              <div style={styles.importantNote}>
                <strong>By clicking "Accept", you agree to be bound by these Terms & Conditions.</strong>
              </div>
            </div>
            <div style={styles.popupButtons}>
              <button style={styles.declineButton} onClick={closeTermsPopup}>Decline</button>
              <button style={styles.acceptButton} onClick={acceptTerms}>Accept Terms</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.error}>{error}</div>}

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>First Name:</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: fieldErrors.firstName ? '#ff4d4d' : '#ddd'
              }}
              value={firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value, setFirstName)}
              disabled={isSubmitting}
              placeholder="Enter first name"
            />
            {fieldErrors.firstName && (
              <div style={styles.validationError}>{fieldErrors.firstName}</div>
            )}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Last Name:</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: fieldErrors.lastName ? '#ff4d4d' : '#ddd'
              }}
              value={lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value, setLastName)}
              disabled={isSubmitting}
              placeholder="Enter last name"
            />
            {fieldErrors.lastName && (
              <div style={styles.validationError}>{fieldErrors.lastName}</div>
            )}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Address:</label>
          <input
            type="text"
            style={{
              ...styles.input,
              borderColor: fieldErrors.address ? '#ff4d4d' : '#ddd'
            }}
            value={address}
            onChange={(e) => handleInputChange("address", e.target.value, setAddress)}
            disabled={isSubmitting}
            placeholder="Enter your full address"
          />
          {fieldErrors.address && (
            <div style={styles.validationError}>{fieldErrors.address}</div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email:</label>
          <input
            type="email"
            style={{
              ...styles.input,
              borderColor: fieldErrors.email ? '#ff4d4d' : '#ddd'
            }}
            value={email}
            onChange={(e) => handleInputChange("email", e.target.value, setEmail)}
            disabled={isSubmitting}
            placeholder="example@domain.com"
          />
          {fieldErrors.email && (
            <div style={styles.validationError}>{fieldErrors.email}</div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Phone Number:</label>
          <input
            type="tel"
            style={{
              ...styles.input,
              borderColor: fieldErrors.phone ? '#ff4d4d' : '#ddd'
            }}
            value={phone}
            onChange={(e) => handleInputChange("phone", e.target.value, setPhone)}
            disabled={isSubmitting}
            placeholder="Enter phone number (digits only)"
          />
          {fieldErrors.phone && (
            <div style={styles.validationError}>{fieldErrors.phone}</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Business Name:</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: fieldErrors.businessName ? '#ff4d4d' : '#ddd'
              }}
              value={businessName}
              onChange={(e) => handleInputChange("businessName", e.target.value, setBusinessName)}
              disabled={isSubmitting}
              placeholder="Enter business name"
            />
            {fieldErrors.businessName && (
              <div style={styles.validationError}>{fieldErrors.businessName}</div>
            )}
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Business Reg No:</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: fieldErrors.businessRegNo ? '#ff4d4d' : '#ddd'
              }}
              value={businessRegNo}
              onChange={(e) => handleInputChange("businessRegNo", e.target.value, setBusinessRegNo)}
              disabled={isSubmitting}
              placeholder="Enter registration number"
            />
            {fieldErrors.businessRegNo && (
              <div style={styles.validationError}>{fieldErrors.businessRegNo}</div>
            )}
          </div>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Business Address:</label>
          <input
            type="text"
            style={{
              ...styles.input,
              borderColor: fieldErrors.businessAddress ? '#ff4d4d' : '#ddd'
            }}
            value={businessAddress}
            onChange={(e) => handleInputChange("businessAddress", e.target.value, setBusinessAddress)}
            disabled={isSubmitting}
            placeholder="Enter business address"
          />
          {fieldErrors.businessAddress && (
            <div style={styles.validationError}>{fieldErrors.businessAddress}</div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>User Type:</label>
          <select
            style={{
              ...styles.input,
              padding: "10px",
              borderColor: fieldErrors.userType ? '#ff4d4d' : '#ddd'
            }}
            value={userType}
            onChange={(e) => handleInputChange("userType", e.target.value, setUserType)}
            disabled={isSubmitting}
          >
            <option value="">-- Select User Type --</option>
            <option value="Individual">Individual</option>
            <option value="Company">Company</option>
            <option value="Agency">Agency</option>
          </select>
          {fieldErrors.userType && (
            <div style={styles.validationError}>{fieldErrors.userType}</div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Password:</label>
          <input
            type="password"
            style={{
              ...styles.input,
              borderColor: fieldErrors.password ? '#ff4d4d' : '#ddd'
            }}
            value={password}
            onChange={(e) => handleInputChange("password", e.target.value, setPassword)}
            disabled={isSubmitting}
            placeholder="Enter password"
          />
          {fieldErrors.password && (
            <div style={styles.validationError}>{fieldErrors.password}</div>
          )}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Confirm Password:</label>
          <input
            type="password"
            style={{
              ...styles.input,
              borderColor: fieldErrors.confirmPassword ? '#ff4d4d' : '#ddd'
            }}
            value={confirmPassword}
            onChange={(e) => handleInputChange("confirmPassword", e.target.value, setConfirmPassword)}
            disabled={isSubmitting}
            placeholder="Confirm password"
          />
          {fieldErrors.confirmPassword && (
            <div style={styles.validationError}>{fieldErrors.confirmPassword}</div>
          )}
        </div>

        {/* Terms and Conditions Checkbox */}
        <div style={styles.termsSection}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              style={styles.checkbox}
              disabled={isSubmitting}
            />
            I agree to the{" "}
            <button
              type="button"
              style={styles.termsLink}
              onClick={handleTermsClick}
              disabled={isSubmitting}
            >
              Terms & Conditions
            </button>
          </label>
        </div>

        <button
          type="submit"
          style={{
            ...styles.button,
            opacity: (!termsAccepted || isSubmitting) ? 0.6 : 1,
            cursor: (!termsAccepted || isSubmitting) ? 'not-allowed' : 'pointer'
          }}
          disabled={!termsAccepted || isSubmitting}
        >
          {isSubmitting ? 'Creating Account...' : 'Register'}
        </button>
        <br />
        <a
          href="/signin"
          style={{
            ...styles.link,
            pointerEvents: isSubmitting ? 'none' : 'auto',
            opacity: isSubmitting ? 0.5 : 1
          }}
        >
          If You Already Have an Account
        </a>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    position: "relative",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
  },
  background: {
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    background: "#ffff",
    backgroundSize: "cover",
    filter: "blur(10px)",
    zIndex: 0,
  },
  form: {
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.3)",
    width: "500px",
    textAlign: "center",
    zIndex: 1,
    maxHeight: "90vh",
    overflowY: "auto",
  },
  formGroup: {
    marginBottom: "15px",
    textAlign: "left",
    flex: 1,
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#333",
    textTransform: "uppercase",
    marginBottom: "5px",
  },
  input: {
    width: "100%",
    padding: "12px",
    border: "2px solid #ddd",
    borderRadius: "6px",
    fontSize: "16px",
    transition: "border-color 0.3s",
    outline: "none",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#0063B4",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
    transition: "transform 0.3s, box-shadow 0.3s",
    marginTop: "10px",
  },
  error: {
    color: "red",
    marginBottom: "10px",
    fontSize: "14px",
    fontWeight: "bold",
    backgroundColor: "#ffebee",
    padding: "8px",
    borderRadius: "4px",
    border: "1px solid #ffcdd2",
  },
  validationError: {
    color: "#ff4d4d",
    fontSize: "12px",
    marginTop: "4px",
    fontWeight: "normal",
  },
  link: {
    color: "#ff4d4d",
    fontSize: "16px",
    display: "block",
    marginTop: "10px",
    textDecoration: "none",
    fontWeight: "bold",
    cursor: "pointer",
  },
  // Terms section styles
  termsSection: {
    marginBottom: "20px",
    textAlign: "left",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    color: "#333",
    cursor: "pointer",
  },
  checkbox: {
    marginRight: "8px",
    cursor: "pointer",
  },
  termsLink: {
    background: "none",
    border: "none",
    color: "#2373ce",
    textDecoration: "underline",
    cursor: "pointer",
    fontSize: "14px",
    padding: "0",
  },
  // Popup styles
  popupOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  popupContent: {
    backgroundColor: "white",
    borderRadius: "8px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.3)",
  },
  popupHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px",
    borderBottom: "1px solid #eee",
  },
  popupTitle: {
    margin: 0,
    color: "#333",
    fontSize: "24px",
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "30px",
    cursor: "pointer",
    color: "#666",
    lineHeight: "1",
    padding: "0",
    width: "30px",
    height: "30px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  termsContent: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
    fontSize: "14px",
    lineHeight: "1.6",
    color: "#333",
  },
  importantNote: {
    backgroundColor: "#f0f8ff",
    padding: "15px",
    borderRadius: "5px",
    marginTop: "20px",
    borderLeft: "4px solid #2373ce",
  },
  popupButtons: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    padding: "20px",
    borderTop: "1px solid #eee",
  },
  declineButton: {
    padding: "10px 20px",
    backgroundColor: "#ccc",
    color: "#333",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s",
  },
  acceptButton: {
    padding: "10px 20px",
    backgroundColor: "#0063B4",
    color: "white",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    transition: "background-color 0.3s",
  },
};

export default Register;