import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, GraduationCap, FileText } from 'lucide-react';
import { Card, Button, Badge, Modal, Input, Select } from '../../components';
import { leadService } from '../../services';
import { colors } from '../../theme';

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

const genderOptions = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const booleanOptions = [
  { value: 'true', label: 'Yes' },
  { value: 'false', label: 'No' },
];

const LeadDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gender: '',
    targetCountry: '',
    consultantName: '',
    englishTestPassed: 'false',
    status: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadLead();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [id]);

  const loadLead = async () => {
    try {
      const data = await leadService.getById(id);
      setLead(data);
      setFormData({
        fullName: data.fullName || '',
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        city: data.city || '',
        gender: data.gender || '',
        targetCountry: data.targetCountry || '',
        consultantName: data.consultantName || '',
        englishTestPassed: data.englishTestPassed ? 'true' : 'false',
        status: data.status || 'new',
      });
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEditLead = async () => {
    if (!validateForm()) return;
    try {
      const updatedLeadData = { ...lead, ...formData };
      await leadService.update(id, formData);
      setLead(updatedLeadData);
      setShowEditModal(false);
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ color: colors.textSecondary }}>Loading lead details...</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: colors.textPrimary }}>Lead not found</h2>
        <Button onClick={() => navigate('/leads')} style={{ marginTop: '16px' }}>
          Back to Leads
        </Button>
      </div>
    );
  }

  const infoItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.borderLight}`,
  };

  const iconContainerStyle = {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: colors.appBg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.textSecondary,
  };

  const labelStyle = {
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '2px',
  };

  const valueStyle = {
    fontSize: '14px',
    color: colors.textPrimary,
    fontWeight: '500',
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={() => navigate('/leads')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'transparent',
          border: 'none',
          color: colors.textSecondary,
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '14px',
          fontFamily: 'inherit',
          padding: 0,
        }}
      >
        <ArrowLeft size={18} />
        Back to Leads
      </button>

      {/* Profile Header */}
      <Card style={{ marginBottom: '24px' }} padding="0">
        <div style={{
          padding: isMobile ? '20px' : '32px',
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'center' : 'flex-start',
          gap: isMobile ? '16px' : '0',
          textAlign: isMobile ? 'center' : 'left',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: 'center',
            gap: isMobile ? '16px' : '20px'
          }}>
            <div
              style={{
                width: isMobile ? '64px' : '80px',
                height: isMobile ? '64px' : '80px',
                borderRadius: '16px',
                backgroundColor: colors.brandPrimary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '700',
                fontSize: isMobile ? '24px' : '32px',
                flexShrink: 0,
              }}
            >
              {lead.fullName?.charAt(0) || '?'}
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', color: colors.textPrimary, fontWeight: '600' }}>
                {lead.fullName}
              </h1>
              <p style={{ margin: '4px 0 12px 0', color: colors.textSecondary, fontSize: '14px' }}>
                {lead.targetUniversity || 'No target university set'}
              </p>
              <Badge variant={lead.status} size="large">{lead.status}</Badge>
            </div>
          </div>
          <Button icon={Edit2} variant="secondary" onClick={() => setShowEditModal(true)} style={{ width: isMobile ? '100%' : 'auto' }}>
            Edit Profile
          </Button>
        </div>
      </Card>

      {/* Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))', gap: isMobile ? '16px' : '24px' }}>
        {/* Personal Information */}
        <Card title="Personal Information">
          <div style={infoItemStyle}>
            <div style={iconContainerStyle}>
              <Mail size={18} />
            </div>
            <div>
              <div style={labelStyle}>Email Address</div>
              <div style={valueStyle}>{lead.email || 'Not provided'}</div>
            </div>
          </div>
          <div style={infoItemStyle}>
            <div style={iconContainerStyle}>
              <Phone size={18} />
            </div>
            <div>
              <div style={labelStyle}>Phone Number</div>
              <div style={valueStyle}>{lead.phone || 'Not provided'}</div>
            </div>
          </div>
          <div style={infoItemStyle}>
            <div style={iconContainerStyle}>
              <MapPin size={18} />
            </div>
            <div>
              <div style={labelStyle}>Address</div>
              <div style={valueStyle}>
                {lead.address ? `${lead.address}, ${lead.city || ''}` : 'Not provided'}
              </div>
            </div>
          </div>
          <div style={{ ...infoItemStyle, borderBottom: 'none' }}>
            <div style={iconContainerStyle}>
              <Calendar size={18} />
            </div>
            <div>
              <div style={labelStyle}>Date of Birth</div>
              <div style={valueStyle}>{lead.dob || 'Not provided'}</div>
            </div>
          </div>
        </Card>

        {/* Academic Information */}
        <Card title="Academic History">
          {lead.academicResults && lead.academicResults.length > 0 ? (
            lead.academicResults.map((result, index) => (
              <div
                key={result.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.appBg,
                  borderRadius: '8px',
                  marginBottom: index < lead.academicResults.length - 1 ? '12px' : 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>
                      {result.degree?.degreeName || 'Unknown Degree'}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                      {result.institute || 'Unknown Institution'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: colors.brandPrimary }}>
                      {result.gpa}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      {result.passingDate ? new Date(result.passingDate).getFullYear() : 'N/A'}
                    </div>
                  </div>
                </div>
                {result.isVerified && (
                  <Badge variant="success" size="small" style={{ marginTop: '8px' }}>
                    Verified
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
              <GraduationCap size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No academic records found</p>
            </div>
          )}
        </Card>

        {/* English Test Results */}
        <Card title="English Test Results">
          {lead.englishTestResults && lead.englishTestResults.length > 0 ? (
            lead.englishTestResults.map((result, index) => (
              <div
                key={result.id}
                style={{
                  padding: '16px',
                  backgroundColor: colors.appBg,
                  borderRadius: '8px',
                  marginBottom: index < lead.englishTestResults.length - 1 ? '12px' : 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: '600', color: colors.textPrimary, marginBottom: '4px' }}>
                      {result.test?.testName || 'Unknown Test'}
                    </div>
                    <div style={{ fontSize: '14px', color: colors.textSecondary }}>
                      {result.testDate ? new Date(result.testDate).toLocaleDateString() : 'N/A'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: colors.brandPrimary }}>
                      {result.overallScore}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.textSecondary }}>
                      / {result.test?.maxScore || '?'}
                    </div>
                  </div>
                </div>
                {result.isVerified && (
                  <Badge variant="success" size="small" style={{ marginTop: '8px' }}>
                    Verified
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
              <FileText size={40} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <p>No test results found</p>
            </div>
          )}
        </Card>

        {/* Journey Timeline */}
        <Card title="Application Journey">
          <div style={{ textAlign: 'center', padding: '24px', color: colors.textSecondary }}>
            <p>Application journey tracking will be displayed here.</p>
            <p style={{ fontSize: '14px' }}>Status: <Badge variant={lead.status}>{lead.status}</Badge></p>
          </div>
        </Card>
      </div>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Lead Details"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditLead}>Update Lead</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Full Name"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              error={errors.fullName}
            />
          </div>
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            error={errors.phone}
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
          />
          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
          />
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
          />
          <Select
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            options={genderOptions}
          />
          <Input
            label="Target Country"
            name="targetCountry"
            value={formData.targetCountry}
            onChange={handleInputChange}
          />
          <Input
            label="Consultant Name"
            name="consultantName"
            value={formData.consultantName}
            onChange={handleInputChange}
          />
          <Select
            label="English Test Passed"
            name="englishTestPassed"
            value={formData.englishTestPassed}
            onChange={handleInputChange}
            options={booleanOptions}
          />
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={statusOptions}
          />
        </div>
      </Modal>

    </div>
  );
};

export default LeadDetails;
