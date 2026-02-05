import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, BookOpen } from 'lucide-react';
import { Card, Table, SearchInput, Badge } from '../../components';
import { courseService } from '../../services';
import { colors } from '../../theme';

const Courses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    loadCourses();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterCourses();
  }, [searchQuery, courses]);

  const loadCourses = async () => {
    try {
      const data = await courseService.getAll();
      setCourses(data);
      setFilteredCourses(data);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    if (!searchQuery.trim()) {
      setFilteredCourses(courses);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = courses.filter(
      (course) =>
        course.courseName?.toLowerCase().includes(query) ||
        course.university?.uniName?.toLowerCase().includes(query) ||
        course.programme?.name?.toLowerCase().includes(query)
    );
    setFilteredCourses(filtered);
  };

  const columns = [
    {
      title: 'Course',
      dataIndex: 'courseName',
      render: (value, row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.brandPrimary}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.brandPrimary,
            }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <div style={{ fontWeight: '500', color: colors.textPrimary }}>{value}</div>
            <div style={{ fontSize: '12px', color: colors.textSecondary }}>
              {row.programme?.name || ''}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'University',
      dataIndex: 'university',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GraduationCap size={16} color={colors.textSecondary} />
          <span>{value?.uniName || '-'}</span>
        </div>
      ),
    },
    {
      title: 'Degree',
      dataIndex: 'degree',
      render: (value) => (
        <Badge variant="info" size="small">
          {value?.degreeName || '-'}
        </Badge>
      ),
    },
    {
      title: 'Min. GPA',
      dataIndex: 'minGpa',
      render: (value) => value ? value.toFixed(1) : '-',
    },
  ];

  return (
    <div>
      {/* Header */}
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
          placeholder="Search courses..."
          style={{ width: isMobile ? '100%' : '350px' }}
        />
        <div style={{ color: colors.textSecondary, fontSize: '14px', textAlign: isMobile ? 'center' : 'right' }}>
          {filteredCourses.length} courses found
        </div>
      </div>

      {/* Courses Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={filteredCourses}
            loading={loading}
            onRowClick={(course) => navigate(`/universities/${course.uniId}`)}
            emptyMessage="No courses found"
          />
        </div>
      </Card>
    </div>
  );
};

export default Courses;
