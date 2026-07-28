import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Eye } from 'lucide-react';
import { Card, Table, Button, Badge, SearchInput, Modal, Input, Select } from '../../components';
import { leadService } from '../../services';
import { LEAD_STATUS, leadStatusVariant, REGISTER_SOURCE, GENDER_OPTIONS } from '../../services/mappers';
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
  const [countries, setCountries] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    gender: '',
    targetCountryId: '',
    consultantId: '',
    registerSource: 'Offline',
    leadStatus: 'NewLead',
    hasPassedEnglishTest: 'false',
  });
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    status: '',
    country: '',
    englishTest: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadLeads();
    loadDropdownData();

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
      const { leads: data } = await leadService.getAll();
      setLeads(data);
      setFilteredLeads(data);
    } catch (error) {
      console.error('Failed to load leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDropdownData = async () => {
    try {
      const { countries: countryList, consultants: consultantList } = await leadService.getDropdownData();
      setCountries(countryList);
      setConsultants(consultantList);
    } catch (error) {
      console.error('Failed to load lead dropdown data:', error);
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
      filtered = filtered.filter(lead => lead && lead.targetCountryId === filters.country);
    }
    if (filters.englishTest) {
      const isPassed = filters.englishTest === 'true';
      filtered = filtered.filter(lead => lead && !!lead.hasPassedEnglishTest === isPassed);
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
      await leadService.create({
        ...formData,
        hasPassedEnglishTest: formData.hasPassedEnglishTest === 'true',
      });
      setShowAddModal(false);
      resetForm();
      loadLeads();
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleEditLead = async () => {
    if (!validateForm()) return;

    try {
      await leadService.update(selectedLead.id, {
        ...formData,
        hasPassedEnglishTest: formData.hasPassedEnglishTest === 'true',
      });
      setShowEditModal(false);
      resetForm();
      loadLeads();
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
      targetCountryId: lead.targetCountryId || '',
      consultantId: lead.consultantId || '',
      registerSource: lead.registerSource || 'Offline',
      leadStatus: lead.status || 'NewLead',
      hasPassedEnglishTest: lead.hasPassedEnglishTest ? 'true' : 'false',
      enrollmentStatus: lead.enrollmentStatus || '',
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
      targetCountryId: '',
      consultantId: '',
      registerSource: 'Offline',
      leadStatus: 'NewLead',
      hasPassedEnglishTest: 'false',
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
      render: (value) => <Badge variant={leadStatusVariant(value)}>{LEAD_STATUS.label(value)}</Badge>,
    },
    {
      title: '',
      dataIndex: 'id',
      render: (_, row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/leads/${row.id}`, { state: { lead: row } });
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
      render: (value) => <Badge variant={leadStatusVariant(value)}>{LEAD_STATUS.label(value)}</Badge>,
    },
    {
      title: 'Target Country',
      dataIndex: 'targetCountryId',
      render: (value, row) => row.targetCountry || countries.find((c) => c.id === value)?.name || '-',
    },
    {
      title: 'Consultant',
      dataIndex: 'consultantId',
      render: (value, row) => row.consultantName || consultants.find((c) => c.id === value)?.name || '-',
    },
    {
      title: 'English Test',
      dataIndex: 'hasPassedEnglishTest',
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
              navigate(`/leads/${row.id}`, { state: { lead: row } });
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

  const genderOptions = GENDER_OPTIONS;
  const statusOptions = LEAD_STATUS.options;
  const registerSourceOptions = REGISTER_SOURCE.options;

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', gridColumn: isMobile ? '1 / -1' : 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textSecondary }}>
            <span style={{ fontSize: '13px', fontWeight: '500' }}>Date Range:</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
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
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>Status</span>
          <Select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
            containerStyle={{ marginBottom: 0 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>Target Country</span>
          <Select
            value={filters.country}
            onChange={(e) => setFilters(prev => ({ ...prev, country: e.target.value }))}
            options={[
              { value: '', label: 'All Countries' },
              ...countries.map((c) => ({ value: c.id, label: c.name })),
            ]}
            containerStyle={{ marginBottom: 0 }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ fontSize: '13px', fontWeight: '500', color: colors.textSecondary }}>English Test</span>
          <Select
            value={filters.englishTest}
            onChange={(e) => setFilters(prev => ({ ...prev, englishTest: e.target.value }))}
            options={[{ value: '', label: 'English Test: Any' }, ...booleanOptions]}
            containerStyle={{ marginBottom: 0 }}
          />
        </div>
      </div>

      {/* Leads Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={filteredLeads}
            loading={loading}
            onRowClick={(lead) => navigate(`/leads/${lead.id}`, { state: { lead } })}
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
          <Select
            label="Target Country"
            name="targetCountryId"
            value={formData.targetCountryId}
            onChange={handleInputChange}
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select target country"
          />
          <Select
            label="Consultant"
            name="consultantId"
            value={formData.consultantId}
            onChange={handleInputChange}
            options={consultants.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select consultant"
          />
          <Select
            label="Register Source"
            name="registerSource"
            value={formData.registerSource}
            onChange={handleInputChange}
            options={registerSourceOptions}
          />
          <Select
            label="Lead Status"
            name="leadStatus"
            value={formData.leadStatus}
            onChange={handleInputChange}
            options={statusOptions}
          />
          <Select
            label="English Test Passed"
            name="hasPassedEnglishTest"
            value={formData.hasPassedEnglishTest}
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
            name="leadStatus"
            value={formData.leadStatus}
            onChange={handleInputChange}
            options={statusOptions}
            placeholder="Select status"
          />
          <Select
            label="Target Country"
            name="targetCountryId"
            value={formData.targetCountryId}
            onChange={handleInputChange}
            options={countries.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select target country"
          />
          <Select
            label="Consultant"
            name="consultantId"
            value={formData.consultantId}
            onChange={handleInputChange}
            options={consultants.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select consultant"
          />
          <Select
            label="Register Source"
            name="registerSource"
            value={formData.registerSource}
            onChange={handleInputChange}
            options={registerSourceOptions}
          />
          <Select
            label="English Test Passed"
            name="hasPassedEnglishTest"
            value={formData.hasPassedEnglishTest}
            onChange={handleInputChange}
            options={booleanOptions}
          />
        </div>
      </Modal>
    </div >
  );
};

export default LeadList;
