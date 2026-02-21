import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  Plus,
  Calendar,
  User,
} from 'lucide-react';
import { Card, Table, Badge, Button, Modal, Input, Select, SearchInput } from '../../components';
import { taskService } from '../../services';
import { colors } from '../../theme';

const Tasks = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [dateFilters, setDateFilters] = useState({ dateFrom: '', dateTo: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    priority: 'medium',
    leadId: '',
  });

  useEffect(() => {
    loadTasks();

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    filterTasks();
  }, [searchQuery, statusFilter, priorityFilter, dateFilters, tasks]);

  const loadTasks = async () => {
    try {
      const data = await taskService.getAll();
      setTasks(data);
      setFilteredTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterTasks = () => {
    let filtered = [...tasks];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title?.toLowerCase().includes(query) ||
          task.lead?.fullName?.toLowerCase().includes(query)
      );
    }

    if (statusFilter) {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    if (dateFilters.dateFrom) {
      filtered = filtered.filter((task) => new Date(task.dueDate) >= new Date(dateFilters.dateFrom));
    }

    if (dateFilters.dateTo) {
      const toDate = new Date(dateFilters.dateTo);
      toDate.setDate(toDate.getDate() + 1);
      filtered = filtered.filter((task) => new Date(task.dueDate) < toDate);
    }

    // Sort by due date
    filtered.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    setFilteredTasks(filtered);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddTask = async () => {
    if (!formData.title.trim()) return;

    try {
      const newTask = await taskService.create({
        ...formData,
        assignedTo: 'Admin User',
      });
      setTasks((prev) => [...prev, newTask]);
      setShowAddModal(false);
      setFormData({ title: '', dueDate: '', priority: 'medium', leadId: '' });
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return colors.error;
      case 'medium':
        return colors.warning;
      case 'low':
        return colors.success;
      default:
        return colors.textSecondary;
    }
  };

  const isOverdue = (dueDate) => {
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  const isDueToday = (dueDate) => {
    return new Date(dueDate).toDateString() === new Date().toDateString();
  };

  const columns = [
    {
      title: 'Task',
      dataIndex: 'title',
      render: (value, row) => (
        <div>
          <div style={{
            fontWeight: '500',
            color: colors.textPrimary,
            textDecoration: row.status === 'completed' ? 'line-through' : 'none',
            opacity: row.status === 'completed' ? 0.6 : 1,
          }}>
            {value}
          </div>
          {row.lead && (
            <div
              style={{
                fontSize: '12px',
                color: colors.textSecondary,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '4px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/leads/${row.leadId}`);
              }}
            >
              <User size={12} />
              {row.lead.fullName}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      render: (value, row) => {
        const overdue = isOverdue(value) && row.status !== 'completed';
        const dueToday = isDueToday(value);

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={14} color={overdue ? colors.error : colors.textSecondary} />
            <span style={{
              color: overdue ? colors.error : dueToday ? colors.warning : colors.textPrimary,
              fontWeight: overdue || dueToday ? '500' : '400',
            }}>
              {new Date(value).toLocaleDateString()}
            </span>
            {overdue && <Badge variant="error" size="small">Overdue</Badge>}
            {dueToday && row.status !== 'completed' && <Badge variant="warning" size="small">Today</Badge>}
          </div>
        );
      },
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      render: (value) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: getPriorityColor(value),
            }}
          />
          <span style={{ textTransform: 'capitalize', color: colors.textPrimary }}>
            {value}
          </span>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (status) => {
        const variants = {
          pending: 'warning',
          in_progress: 'info',
          completed: 'success',
        };
        return (
          <Badge variant={variants[status] || 'default'}>
            {status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </Badge>
        );
      },
    },
    {
      title: 'Actions',
      dataIndex: 'id',
      render: (id, row) => (
        <div style={{ display: 'flex', gap: '8px' }}>
          {row.status !== 'completed' && (
            <Button
              variant="ghost"
              size="small"
              icon={CheckCircle}
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(id, 'completed');
              }}
            >
              Complete
            </Button>
          )}
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  const priorityOptions = [
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  // Calculate stats
  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    overdue: tasks.filter(t => isOverdue(t.dueDate) && t.status !== 'completed').length,
    completed: tasks.filter(t => t.status === 'completed').length,
  };

  return (
    <div>
      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: isMobile ? '12px' : '16px',
        marginBottom: '24px'
      }}>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.info}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.info,
              flexShrink: 0,
            }}>
              <Clock size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.total}</div>
              <div style={{ fontSize: isMobile ? '12px' : '13px', color: colors.textSecondary }}>Total Tasks</div>
            </div>
          </div>
        </Card>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.warning}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.warning,
              flexShrink: 0,
            }}>
              <AlertTriangle size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.pending}</div>
              <div style={{ fontSize: isMobile ? '12px' : '13px', color: colors.textSecondary }}>Pending</div>
            </div>
          </div>
        </Card>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.error}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.error,
              flexShrink: 0,
            }}>
              <AlertTriangle size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.overdue}</div>
              <div style={{ fontSize: isMobile ? '12px' : '13px', color: colors.textSecondary }}>Overdue</div>
            </div>
          </div>
        </Card>
        <Card padding={isMobile ? '16px' : '20px'}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: isMobile ? '36px' : '40px',
              height: isMobile ? '36px' : '40px',
              borderRadius: '8px',
              backgroundColor: `${colors.success}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.success,
              flexShrink: 0,
            }}>
              <CheckCircle size={isMobile ? 18 : 20} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: colors.textPrimary }}>{stats.completed}</div>
              <div style={{ fontSize: isMobile ? '12px' : '13px', color: colors.textSecondary }}>Completed</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        marginBottom: '24px',
        gap: '16px',
      }}>
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: isMobile ? '12px' : '16px',
          alignItems: isMobile ? 'stretch' : 'center',
        }}>
          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            style={{ width: isMobile ? '100%' : '280px' }}
          />
          <div style={{
            display: 'flex',
            gap: '12px',
          }}>
            <div style={{ flex: 1, minWidth: isMobile ? 0 : '160px' }}>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[{ value: '', label: 'All Statuses' }, ...statusOptions]}
                placeholder="Status"
              />
            </div>
            <div style={{ flex: 1, minWidth: isMobile ? 0 : '160px' }}>
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                options={[{ value: '', label: 'All Priorities' }, ...priorityOptions]}
                placeholder="Priority"
              />
            </div>
            {/* Added Date Filter UI */}
            <div style={{ display: 'flex', gap: '8px', flex: 2, minWidth: isMobile ? '100%' : '300px' }}>
              <Input
                type="date"
                placeholder="From Date"
                value={dateFilters.dateFrom}
                onChange={(e) => setDateFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
              <Input
                type="date"
                placeholder="To Date"
                value={dateFilters.dateTo}
                onChange={(e) => setDateFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                containerStyle={{ flex: 1, marginBottom: 0 }}
              />
            </div>
          </div>
        </div>
        <Button icon={Plus} onClick={() => setShowAddModal(true)} style={{ width: isMobile ? '100%' : 'auto' }}>
          Add Task
        </Button>
      </div>

      {/* Tasks Table */}
      <Card padding="0">
        <div style={{ overflowX: 'auto' }}>
          <Table
            columns={columns}
            data={filteredTasks}
            loading={loading}
            emptyMessage="No tasks found"
          />
        </div>
      </Card>

      {/* Add Task Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add New Task"
        size="medium"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask}>Add Task</Button>
          </>
        }
      >
        <Input
          label="Task Title"
          name="title"
          value={formData.title}
          onChange={handleInputChange}
          placeholder="Enter task title"
          required
        />
        <Input
          label="Due Date"
          name="dueDate"
          type="date"
          value={formData.dueDate}
          onChange={handleInputChange}
          required
        />
        <Select
          label="Priority"
          name="priority"
          value={formData.priority}
          onChange={handleInputChange}
          options={priorityOptions}
        />
      </Modal>
    </div>
  );
};

export default Tasks;
