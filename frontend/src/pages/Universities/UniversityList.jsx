import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Edit2, MapPin, Globe, BookOpen } from 'lucide-react';
import { Card, Table, Button, SearchInput, Modal, Input, Select } from '../../components';
import { universityService, lookupService } from '../../services';
import { colors } from '../../theme';

const UniversityList = () => {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [countries, setCountries] = useState([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [formData, setFormData] = useState({
    uniName: '',
    sysCountryId: '',
    website: '',
    address: '',
    aboutUs: '',
    commission: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadUniversities();
    loadCountries();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterUniversities();
  }, [searchQuery, universities]);

  const loadUniversities = async () => {
    try {
      const data = await universityService.getAll();
      setUniversities(data);
      setFilteredUniversities(data);
    } catch (error) {
      console.error('Failed to load universities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCountries = async () => {
    try {
      const data = await lookupService.getCountries();
      setCountries(data);
    } catch (error) {
      console.error('Failed to load countries:', error);
    }
  };

  const filterUniversities = () => {
    if (!searchQuery.trim()) {
      setFilteredUniversities(universities);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = universities.filter(
      (uni) =>
        uni.uniName?.toLowerCase().includes(query) ||
        uni.country?.countryName?.toLowerCase().includes(query)
    );
    setFilteredUniversities(filtered);
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
    if (!formData.uniName.trim()) {
      newErrors.uniName = 'University name is required';
    }
    if (!formData.sysCountryId) {
      newErrors.sysCountryId = 'Country is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddUniversity = async () => {
    if (!validateForm()) return;

    try {
      const newUni = await universityService.create({
        ...formData,
        commission: formData.commission ? parseFloat(formData.commission) : null,
      });
      const country = countries.find(c => c.id === formData.sysCountryId);
      setUniversities((prev) => [{ ...newUni, country }, ...prev]);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Failed to create university:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      uniName: '',
      sysCountryId: '',
      website: '',
      address: '',
      aboutUs: '',
      commission: '',
    });
    setErrors({});
  };

  const columns = [
    {
      title: 'University',
      dataIndex: 'uniName',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: colors.appBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: `1px solid ${colors.borderLight}`,
            }}
          >
            {row.logoUrl ? (
              <img
                src={row.logoUrl}
                alt={value}
                style={{ width: '36px', height: '36px', objectFit: 'contain' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerHTML = value?.charAt(0) || 'U';
                }}
              />
            ) : (
              <span style={{ fontWeight: '600', color: colors.brandPrimary }}>
                {value?.charAt(0) || 'U'}
              </span>
            )}
          </div>
          <div>
            <div style={{ fontWeight: '500', color: colors.textPrimary }}>{value}</div>
            {row.website && (
              <div style={{ fontSize: '12px', color: colors.textSecondary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Globe size={12} />
                {row.website.replace(/^https?:\/\//, '')}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'country',
      render: (_, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: colors.textSecondary }}>
          <MapPin size={14} />
          <span>
            {row.city?.cityName ? `${row.city.cityName}, ` : ''}
            {row.country?.countryName || '-'}
          </span>
        </div>
      ),
    },
    {
      title: 'Commission',
      dataIndex: 'commission',
      render: (value) => value ? `${value}%` : '-',
    },
    {
      title: 'Actions',
      dataIndex: 'id',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/universities/${row.id}`);
            }}
            style={{
              padding: '8px 12px',
              border: 'none',
              backgroundColor: colors.appBg,
              cursor: 'pointer',
              borderRadius: '6px',
              color: colors.textSecondary,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
            }}
            title="View Courses"
          >
            <BookOpen size={14} />
            Courses
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/universities/${row.id}`);
            }}
            style={{
              padding: '8px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              borderRadius: '4px',
              color: colors.textSecondary,
            }}
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  const countryOptions = countries.map((c) => ({
    value: c.id,
    label: c.countryName,
  }));

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
          placeholder="Search by university name..."
          style={{ width: isMobile ? '100%' : '350px' }}
        />
        <Button icon={Plus} onClick={() => setShowAddModal(true)} style={{ width: isMobile ? '100%' : 'auto' }}>
          Add University
        </Button>
      </div>

      {/* Universities Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={filteredUniversities}
            loading={loading}
            onRowClick={(uni) => navigate(`/universities/${uni.id}`)}
            emptyMessage="No universities found"
          />
        </div>
      </Card>

      {/* Add University Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add New University"
        size="large"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleAddUniversity}>Save University</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="University Name"
              name="uniName"
              value={formData.uniName}
              onChange={handleInputChange}
              required
              error={errors.uniName}
              placeholder="Enter university name"
            />
          </div>
          <Select
            label="Country"
            name="sysCountryId"
            value={formData.sysCountryId}
            onChange={handleInputChange}
            options={countryOptions}
            required
            error={errors.sysCountryId}
            placeholder="Select country"
          />
          <Input
            label="Website"
            name="website"
            value={formData.website}
            onChange={handleInputChange}
            placeholder="https://www.university.edu"
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="Address"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter full address"
            />
          </div>
          <Input
            label="Commission %"
            name="commission"
            type="number"
            value={formData.commission}
            onChange={handleInputChange}
            placeholder="e.g., 15"
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500', color: colors.textPrimary }}>
              About University
            </label>
            <textarea
              name="aboutUs"
              value={formData.aboutUs}
              onChange={handleInputChange}
              placeholder="Enter description about the university..."
              style={{
                width: '100%',
                padding: '10px 14px',
                fontSize: '14px',
                border: `1px solid ${colors.borderLight}`,
                borderRadius: '8px',
                outline: 'none',
                minHeight: '100px',
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UniversityList;
