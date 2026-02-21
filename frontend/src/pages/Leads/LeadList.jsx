import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye } from 'lucide-react';
import { Card, Table, Button, Badge, SearchInput, Modal, Input, Select } from '../../components';
import { leadService } from '../../services';
import { colors } from '../../theme';

const LeadList = () => {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [filteredLeads, setFilteredLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
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
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadLeads();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterLeads();
  }, [searchQuery, leads]);

  const loadLeads = async () => {
    try {
      const data = await leadService.getAll();
      setLeads(data);
      setFilteredLeads(data);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeads = () => {
    let filtered = leads;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (lead) => {
          if (!lead) return false;
          return (
            lead.fullName?.toLowerCase().includes(query) ||
            lead.email?.toLowerCase().includes(query) ||
            lead.phone?.includes(query)
          );
        }
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter((lead) => new Date(lead.createdAt) >= new Date(filters.dateFrom));
    }

    if (filters.dateTo) {
      // Add one day to include the whole 'dateTo' day
      const toDate = new Date(filters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      filtered = filtered.filter((lead) => lead && new Date(lead.createdAt) < toDate);
    }

    if (filters.status) {
      filtered = filtered.filter(lead => lead && lead.status === filters.status);
    }
    if (filters.country) {
      filtered = filtered.filter(lead => lead && lead.targetCountry === filters.country);
    }
    if (filters.englishTest) {
      const isPassed = filters.englishTest === 'true';
      filtered = filtered.filter(lead => lead && !!lead.englishTestPassed === isPassed);
    }

    setFilteredLeads(filtered);
  };

  useEffect(() => {
    filterLeads();
  }, [searchQuery, leads, filters]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLead = async () => {
    if (!validateForm()) return;

    try {
      const newLead = await leadService.create(formData);
      setLeads((prev) => [newLead, ...prev]);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleEditLead = async () => {
    if (!validateForm()) return;

    try {
      await leadService.update(selectedLead.id, formData);
      setLeads((prev) =>
        prev.map((lead) => (lead.id === selectedLead.id ? { ...lead, ...formData } : lead))
      );
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to update lead:', error);
    }
  };

  const openEditModal = (lead) => {
    setSelectedLead(lead);
    setFormData({
      fullName: lead.fullName || '',
      phone: lead.phone || '',
      email: lead.email || '',
      address: lead.address || '',
      city: lead.city || '',
      gender: lead.gender || '',
      targetCountry: lead.targetCountry || '',
      consultantName: lead.consultantName || '',
      englishTestPassed: lead.englishTestPassed ? 'true' : 'false',
      status: lead.status || 'eligible',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      gender: '',
      targetCountry: '',
      consultantName: '',
      englishTestPassed: 'false',
    });
    setErrors({});
    setSelectedLead(null);
  };

  const columns = isMobile ? [
    {
      title: 'Lead',
      dataIndex: 'fullName',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: colors.brandPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '600',
              fontSize: '14px',
              flexShrink: 0,
            }}
          >
            {value?.charAt(0) || '?'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: '500', color: colors.textPrimary }}>{value}</div>
            <div style={{ fontSize: '12px', color: colors.textSecondary }}>{row.phone || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Badge variant={value}>{value}</Badge>,
    },
    {
      title: '',
      dataIndex: 'id',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/leads/${row.id}`);
          }}
          style={{
            padding: '6px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            borderRadius: '4px',
            color: colors.textSecondary,
          }}
          title="View Profile"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ] : [
    {
      title: 'Name',
      dataIndex: 'fullName',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: colors.brandPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            {value?.charAt(0) || '?'}
          </div>
          <span style={{ fontWeight: '500', color: colors.textPrimary }}>{value}</span>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      render: (value) => value || '-',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      render: (value) => value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (value) => <Badge variant={value} style={{ textTransform: 'capitalize' }}>{value}</Badge>,
    },
    {
      title: 'Target Country',
      dataIndex: 'targetCountry',
      render: (value) => value || '-',
    },
    {
      title: 'Consultant',
      dataIndex: 'consultantName',
      render: (value) => value || '-',
    },
    {
      title: 'English Test',
      dataIndex: 'englishTestPassed',
      render: (value) => (
        <Badge variant={value ? 'success' : 'error'}>
          {value ? 'Passed' : 'No'}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      dataIndex: 'id',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/leads/${row.id}`);
            }}
            style={{
              padding: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              color: colors.textSecondary,
            }}
            title="View Profile"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEditModal(row);
            }}
            style={{
              padding: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              color: colors.textSecondary,
            }}
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const genderOptions = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'other', label: 'Other' },
  ];

  const statusOptions = [
    { value: 'eligible', label: 'Eligible' },
    { value: 'not eligible', label: 'Not Eligible' },
    { value: 'unreachable', label: 'Unreachable' },
    { value: 'visited', label: 'Visited' },
    { value: 'applied', label: 'Applied' },
  ];

  const booleanOptions = [
    { value: 'true', label: 'Yes' },
    { value: 'false', label: 'No' },
  ];

  return (
    <div>
      {/* Header Actions */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? '12px' : '16px',
          marginBottom: '24px',
        }}
      >
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, or phone..."
          style={{ width: isMobile ? '100%' : '350px' }}
        />
        <Button icon={Plus} onClick={() => setShowAddModal(true)} style={{ width: isMobile ? '100%' : 'auto' }}>
          Add Lead
        </Button>
      </div>

      {/* Filter Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
        backgroundColor: colors.appBg,
        padding: '16px',
        borderRadius: '12px',
        border: `1px solid ${colors.borderLight}`
      }}>
        <div style={{ display: 'flex', gap: '8px', gridColumn: isMobile ? '1 / -1' : 'span 2' }}>
          <Input
            type="date"
            placeholder="From Date"
            value={filters.dateFrom}
            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
          <Input
            type="date"
            placeholder="To Date"
            value={filters.dateTo}
            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
            containerStyle={{ flex: 1, marginBottom: 0 }}
          />
        </div>
        <Select
          value={filters.status}
          onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
          options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
        />
        <Select
          value={filters.country}
          onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
          options={[
            { value: '', label: 'All Countries' },
            { value: 'United Kingdom', label: 'United Kingdom' },
            { value: 'United States', label: 'United States' },
            { value: 'Canada', label: 'Canada' },
            { value: 'Australia', label: 'Australia' }
          ]}
        />
        <Select
          value={filters.englishTest}
          onChange={(e) => setFilters(prev => ({ ...prev, englishTest: e.target.value }))}
          options={[{ value: '', label: 'English Test: Any' }, ...booleanOptions]}
        />
      </div>

      {/* Leads Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={filteredLeads}
            loading={loading}
            onRowClick={(lead) => navigate(`/leads/${lead.id}`)}
            emptyMessage="No leads found"
          />
        </div>
      </Card>

      {/* Add Lead Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New Lead"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddLead}>Save Lead</Button>
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
              placeholder="Enter full name"
            />
          </div>
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            error={errors.phone}
            placeholder="Enter phone number"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter email address"
          />
          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter address"
          />
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="Enter city"
          />
          <Select
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            options={genderOptions}
            placeholder="Select gender"
          />
          <Input
            label="Target Country"
            name="targetCountry"
            value={formData.targetCountry}
            onChange={handleInputChange}
            placeholder="Enter target country"
          />
          <Input
            label="Consultant Name"
            name="consultantName"
            value={formData.consultantName}
            onChange={handleInputChange}
            placeholder="Enter consultant name"
          />
          <Select
            label="English Test Passed"
            name="englishTestPassed"
            value={formData.englishTestPassed}
            onChange={handleInputChange}
            options={booleanOptions}
          />
        </div>
      </Modal>

      {/* Edit Lead Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          resetForm();
        }}
        title="Edit Lead"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowEditModal(false);
              resetForm();
            }}>
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
              placeholder="Enter full name"
            />
          </div>
          <Input
            label="Phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            required
            error={errors.phone}
            placeholder="Enter phone number"
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter email address"
          />
          <Input
            label="Address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            placeholder="Enter address"
          />
          <Input
            label="City"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="Enter city"
          />
          <Select
            label="Gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            options={genderOptions}
            placeholder="Select gender"
          />
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={statusOptions}
            placeholder="Select status"
          />
          <Input
            label="Target Country"
            name="targetCountry"
            value={formData.targetCountry}
            onChange={handleInputChange}
            placeholder="Enter target country"
          />
          <Input
            label="Consultant Name"
            name="consultantName"
            value={formData.consultantName}
            onChange={handleInputChange}
            placeholder="Enter consultant name"
          />
          <Select
            label="English Test Passed"
            name="englishTestPassed"
            value={formData.englishTestPassed}
            onChange={handleInputChange}
            options={booleanOptions}
          />
        </div>
      </Modal>
    </div >
  );
};

export default LeadList;
