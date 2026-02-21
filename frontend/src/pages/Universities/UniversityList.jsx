import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, MapPin, Globe, BookOpen, Search, X, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { Card, Button, Input, Select, Modal } from '../../components';
import { universityService, lookupService, detailedCourseService } from '../../services';
import { colors } from '../../theme';

const UniversityList = () => {
  const navigate = useNavigate();
  const [universities, setUniversities] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [filteredUniversities, setFilteredUniversities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    country: '',
    location: '',
    level: '',
    subject: '',
    university: '',
    intake: '',
    year: '',
  });

  // UI State
  const [expandedUnis, setExpandedUnis] = useState(new Set());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUniFormModal, setShowUniFormModal] = useState(false);
  const [showEditCourseModal, setShowEditCourseModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [countries, setCountries] = useState([]);

  // Form states
  const [uniFormData, setUniFormData] = useState({
    uniName: '',
    countryId: '',
    description: '',
  });
  const [courseFormData, setCourseFormData] = useState({
    courseName: '',
    degreeName: '',
    intakeInfo: '',
    courseDuration: '',
    tuitionFee: '',
    currency: 'GBP',
    scholarshipMaxAmount: '',
  });

  useEffect(() => {
    loadData();
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, filters, universities, allCourses]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uniData, courseData, countryData] = await Promise.all([
        universityService.getAll(),
        detailedCourseService.getAll(),
        lookupService.getCountries()
      ]);
      setUniversities(uniData);
      setAllCourses(courseData);
      setCountries(countryData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filteredUnis = [...universities];

    // Generic Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredUnis = filteredUnis.filter(u =>
        u.uniName?.toLowerCase().includes(q) ||
        u.country?.countryName?.toLowerCase().includes(q)
      );
    }

    // Advanced Filters
    if (filters.country) {
      filteredUnis = filteredUnis.filter(u => u.sysCountryId === filters.country);
    }
    if (filters.university) {
      filteredUnis = filteredUnis.filter(u => u.id === filters.university);
    }

    // If course-specific filters are applied, filter universities based on matching courses
    const hasCourseFilters = filters.level || filters.subject || filters.intake || filters.year;

    if (hasCourseFilters) {
      filteredUnis = filteredUnis.filter(u => {
        const uniCourses = getCoursesForUni(u.id);
        return uniCourses.length > 0;
      });
    }

    setFilteredUniversities(filteredUnis);
  };

  const getCoursesForUni = (uniId) => {
    return allCourses.filter(c => {
      if (c.uniId !== uniId) return false;
      if (filters.level && c.degreeName !== filters.level) return false;
      if (filters.subject && c.programmeName !== filters.subject) return false;
      if (filters.intake && !c.intakeInfo?.includes(filters.intake)) return false;
      if (filters.year && !c.intakeInfo?.includes(filters.year)) return false;
      return true;
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilters({
      country: '',
      location: '',
      level: '',
      subject: '',
      university: '',
      intake: '',
      year: '',
    });
  };

  const toggleUniExpanded = (uniId) => {
    setExpandedUnis(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniId)) newSet.delete(uniId);
      else newSet.add(uniId);
      return newSet;
    });
  };

  // Extract unique filter options from courses
  const levels = [...new Set(allCourses.map(c => c.degreeName))].filter(Boolean);
  const subjects = [...new Set(allCourses.map(c => c.programmeName))].filter(Boolean);

  const filterBlockStyle = {
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
    marginBottom: '16px',
    backgroundColor: colors.appBg,
    padding: '16px',
    borderRadius: '12px',
    border: `1px solid ${colors.borderLight}`
  };

  const handleUniFormChange = (e) => setUniFormData({ ...uniFormData, [e.target.name]: e.target.value });
  const handleCourseFormChange = (e) => setCourseFormData({ ...courseFormData, [e.target.name]: e.target.value });

  const openEditCourse = (course) => {
    setSelectedCourse(course);
    setCourseFormData({
      courseName: course.courseName || '',
      degreeName: course.degreeName || '',
      intakeInfo: course.intakeInfo || '',
      courseDuration: course.courseDuration || '',
      tuitionFee: course.tuitionFee || '',
      currency: course.currency || 'GBP',
      scholarshipMaxAmount: course.scholarshipMaxAmount || '',
    });
    setShowEditCourseModal(true);
  };

  const CourseItemCard = ({ course }) => (
    <div style={{
      border: `1px solid ${colors.borderLight}`,
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '12px',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 8px 0', color: colors.textPrimary, fontSize: '16px' }}>{course.courseName}</h4>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: `${colors.info}15`, color: colors.info, borderRadius: '4px' }}>
            {course.degreeName}
          </span>
          <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: `${colors.warning}15`, color: colors.warning, borderRadius: '4px' }}>
            Intake: {course.intakeInfo}
          </span>
          <span style={{ fontSize: '12px', padding: '4px 8px', backgroundColor: colors.appBg, color: colors.textSecondary, borderRadius: '4px', border: `1px solid ${colors.borderLight}` }}>
            Duration: {course.courseDuration}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '8px', fontSize: '13px', color: colors.textSecondary }}>
          <div><strong>Tuition Fee:</strong> {course.currency} {course.tuitionFee?.toLocaleString()} / year</div>
          <div><strong>Initial Deposit:</strong> {course.currency} {course.initialDeposit?.toLocaleString()}</div>
          <div><strong>IELTS Required:</strong> Overall {course.ieltsMinOverall} (Min section {course.ieltsMinSection})</div>
          {course.scholarshipMaxAmount && (
            <div style={{ color: colors.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Award size={14} /> <strong>Scholarship:</strong> Up to {course.currency} {course.scholarshipMaxAmount?.toLocaleString()}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: isMobile ? 'stretch' : 'flex-end', minWidth: '120px' }}>
        <Button variant="secondary" onClick={() => openEditCourse(course)}>
          Edit Course
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexDirection: isMobile ? 'column' : 'row', gap: '16px' }}>
        <h2 style={{ margin: 0, color: colors.textPrimary, fontSize: '24px' }}>Universities & Courses</h2>
        <div style={{ display: 'flex', gap: '12px', width: isMobile ? '100%' : 'auto' }}>
          <Button icon={Plus} onClick={() => setShowAddModal(true)} style={{ flex: isMobile ? 1 : 'none' }}>
            Add University
          </Button>
        </div>
      </div>

      {/* Advanced Search Block */}
      <div style={filterBlockStyle}>
        <div style={{ gridColumn: '1 / -1', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ color: colors.textPrimary }}>Advanced Search</strong>
          <button onClick={clearFilters} style={{ background: 'none', border: 'none', color: colors.brandPrimary, cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <X size={14} /> Clear All
          </button>
        </div>

        <Input
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={Search}
        />
        <Select
          value={filters.country}
          onChange={(e) => handleFilterChange('country', e.target.value)}
          options={[{ value: '', label: 'All Countries' }, ...countries.map(c => ({ value: c.id, label: c.countryName }))]}
        />
        <Select
          value={filters.level}
          onChange={(e) => handleFilterChange('level', e.target.value)}
          options={[{ value: '', label: 'All Levels' }, ...levels.map(l => ({ value: l, label: l }))]}
        />
        <Select
          value={filters.subject}
          onChange={(e) => handleFilterChange('subject', e.target.value)}
          options={[{ value: '', label: 'All Subjects' }, ...subjects.map(s => ({ value: s, label: s }))]}
        />
        <Input
          placeholder="Intake (e.g. SEP)"
          value={filters.intake}
          onChange={(e) => handleFilterChange('intake', e.target.value)}
        />
        <Input
          placeholder="Year (e.g. 2026)"
          value={filters.year}
          onChange={(e) => handleFilterChange('year', e.target.value)}
        />
      </div>

      {/* Results List */}
      <div style={{ marginBottom: '16px', color: colors.textSecondary, fontSize: '14px' }}>
        Showing {filteredUniversities.length} Universities
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary }}>Loading...</div>
      ) : filteredUniversities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: colors.textSecondary, backgroundColor: '#fff', borderRadius: '12px' }}>
          No universities found matching your criteria.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredUniversities.map(uni => {
            const uniCourses = getCoursesForUni(uni.id);
            const isExpanded = expandedUnis.has(uni.id);
            const hasScholarships = uniCourses.some(c => c.scholarshipMaxAmount > 0);

            return (
              <div key={uni.id} onClick={() => navigate(`/universities/${uni.id}`)} style={{ cursor: 'pointer' }}>
                <Card padding="20px" style={{ transition: 'all 0.2s', ':hover': { borderColor: colors.brandPrimary } }}>
                  {/* University Overview */}
                  <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{
                        width: '56px', height: '56px', borderRadius: '10px', backgroundColor: colors.appBg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.borderLight}`
                      }}>
                        {uni.logoUrl ? (
                          <img src={uni.logoUrl} alt={uni.uniName} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                        ) : (
                          <span style={{ fontSize: '20px', fontWeight: 'bold', color: colors.brandPrimary }}>{uni.uniName?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', color: colors.textPrimary, fontSize: '18px' }}>{uni.uniName}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', color: colors.textSecondary }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14} /> {uni.country?.countryName || 'Unknown Location'}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} /> {uniCourses.length} Courses</span>
                          {hasScholarships && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: colors.success, fontWeight: '500' }}>
                              <Award size={14} /> Scholarships Available
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', width: isMobile ? '100%' : 'auto', flexDirection: isMobile ? 'column' : 'row' }}>
                      <Button
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleUniExpanded(uni.id);
                        }}
                        style={{ width: isMobile ? '100%' : 'auto', display: 'flex', justifyContent: 'center', gap: '8px' }}
                      >
                        {isExpanded ? (
                          <><ChevronUp size={16} /> Hide Courses</>
                        ) : (
                          <><ChevronDown size={16} /> View Courses</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Course Item Cards (Expanded View) */}
                  {isExpanded && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: `1px solid ${colors.borderLight}` }}>
                      {uniCourses.length === 0 ? (
                        <div style={{ color: colors.textSecondary, fontSize: '14px', textAlign: 'center', padding: '12px' }}>
                          No courses available matching the current filters.
                        </div>
                      ) : (
                        uniCourses.map(course => <CourseItemCard key={course.id} course={course} />)
                      )}
                    </div>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      )}

      {/* Add University Modal - Modified for Options */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Data"
        size="medium"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          <Card
            padding="20px"
            style={{ border: `1px solid ${colors.borderLight}`, cursor: 'pointer', transition: 'all 0.2s', ':hover': { borderColor: colors.brandPrimary } }}
            onClick={() => {
              setShowAddModal(false);
              setShowUniFormModal(true);
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', color: colors.textPrimary }}>Add University</h3>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: '14px' }}>Add a single university and its details manually.</p>
          </Card>

          <Card padding="20px" style={{ border: `1px solid ${colors.borderLight}`, backgroundColor: `${colors.brandPrimary}0a`, cursor: 'pointer' }}>
            <h3 style={{ margin: '0 0 8px 0', color: colors.brandPrimary, display: 'flex', alignItems: 'center', gap: '8px' }}>
              Bulk Upload
            </h3>
            <p style={{ margin: '0 0 16px', color: colors.textSecondary, fontSize: '14px' }}>Upload universities and courses in bulk via CSV, Excel, etc. docs.</p>
            <Button variant="primary" style={{ width: '100%' }}>Select File</Button>
          </Card>
        </div>
      </Modal>

      {/* University Form Modal (Add) */}
      <Modal
        isOpen={showUniFormModal}
        onClose={() => {
          setShowUniFormModal(false);
          setUniFormData({ uniName: '', countryId: '', description: '' });
        }}
        title="Add University"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => {
              setShowUniFormModal(false);
            }}>Cancel</Button>
            <Button onClick={() => {
              console.log('Save Uni', uniFormData);
              setShowUniFormModal(false);
            }}>Save University</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px 0' }}>
          <Input label="University Name" name="uniName" value={uniFormData.uniName} onChange={handleUniFormChange} placeholder="Enter university name" />
          <Select label="Country" name="countryId" value={uniFormData.countryId} onChange={handleUniFormChange} options={[{ value: '', label: 'Select Country' }, ...countries.map(c => ({ value: c.id, label: c.countryName }))]} />
          <Input label="Description" name="description" value={uniFormData.description} onChange={handleUniFormChange} placeholder="Optional description..." />
        </div>
      </Modal>

      {/* Course Form Modal (Edit) */}
      <Modal
        isOpen={showEditCourseModal}
        onClose={() => setShowEditCourseModal(false)}
        title="Edit Course Details"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowEditCourseModal(false)}>Cancel</Button>
            <Button onClick={() => {
              console.log('Save Course', courseFormData);
              setShowEditCourseModal(false);
            }}>Save Course</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', padding: '16px 0' }}>
          <div style={{ gridColumn: '1 / -1' }}><Input label="Course Name" name="courseName" value={courseFormData.courseName} onChange={handleCourseFormChange} /></div>
          <Input label="Degree Level" name="degreeName" value={courseFormData.degreeName} onChange={handleCourseFormChange} />
          <Input label="Intake" name="intakeInfo" value={courseFormData.intakeInfo} onChange={handleCourseFormChange} />
          <Input label="Duration" name="courseDuration" value={courseFormData.courseDuration} onChange={handleCourseFormChange} />
          <Input label="Tuition Fee" name="tuitionFee" type="number" value={courseFormData.tuitionFee} onChange={handleCourseFormChange} />
          <Input label="Currency" name="currency" value={courseFormData.currency} onChange={handleCourseFormChange} />
          <Input label="Max Scholarship" name="scholarshipMaxAmount" type="number" value={courseFormData.scholarshipMaxAmount} onChange={handleCourseFormChange} />
        </div>
      </Modal>

    </div>
  );
};

export default UniversityList;
