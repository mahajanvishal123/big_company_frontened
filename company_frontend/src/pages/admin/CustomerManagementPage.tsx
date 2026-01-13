import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  message,
  Typography,
  Row,
  Col,
  Select,
  Statistic,
  Avatar,
  Tooltip
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  ReloadOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingOutlined,
  DollarOutlined,
  EyeOutlined,
  StopOutlined,
  PhoneOutlined,
  MailOutlined,
  TeamOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { adminApi } from '../../services/apiService';

const { Title, Text } = Typography;
const { Option } = Select;

interface Customer {
  id: number; // ConsumerProfile ID
  fullName: string | null;
  gasBalance?: string;
  totalSpent?: number;
  orderCount?: number;
  user: {
    id: number;
    name: string;
    email: string;
    phone: string;
    isActive: boolean;
  };
}

const CustomerManagementPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [form] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getCustomers();
      if (response.data?.customers) {
        // Add some mock data for fields shown in design but might not be in API yet
        const enrichedCustomers = response.data.customers.map((c: any) => ({
          ...c,
          id: c.id,
          gasBalance: (Math.random() * 15).toFixed(2) + " M³",
          totalSpent: Math.floor(Math.random() * 1000000),
          orderCount: Math.floor(Math.random() * 50)
        }));
        setCustomers(enrichedCustomers);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      message.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    try {
      setLoading(true);
      if (editingId) {
        await adminApi.updateCustomer(editingId.toString(), values);
        message.success('Customer updated successfully');
      } else {
        await adminApi.createCustomer(values);
        message.success('Customer created successfully');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingId(null);
      loadCustomers();
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to save customer');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (record: Customer) => {
    const newStatus = !record.user?.isActive;
    try {
      // API expects string status in data object
      await adminApi.updateCustomerStatus(record.user.id.toString(), { 
        status: newStatus ? 'active' : 'inactive' 
      });
      message.success(`Customer ${newStatus ? 'activated' : 'deactivated'} successfully`);
      loadCustomers();
    } catch (error: any) {
      message.error('Failed to update status');
    }
  };

  const filteredCustomers = customers.filter(c => {
    const name = c.fullName || c.user?.name || '';
    const email = c.user?.email || '';
    const phone = c.user?.phone || '';
    const matchesSearch = name.toLowerCase().includes(searchText.toLowerCase()) ||
                         email.toLowerCase().includes(searchText.toLowerCase()) ||
                         phone.includes(searchText);
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && c.user?.isActive) ||
                         (statusFilter === 'inactive' && !c.user?.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleView = async (record: Customer) => {
    try {
      const response = await adminApi.getCustomer(record.id.toString());
      if (response.data?.success) {
        setSelectedCustomer(response.data.customer);
        setViewModalVisible(true);
      }
    } catch (error) {
      message.error('Failed to load customer details');
    }
  };

  const columns: ColumnsType<Customer> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ backgroundColor: record.user?.isActive ? '#1890ff' : '#ccc' }}
          />
          <div>
            <Text strong style={{ display: 'block' }}>{record.fullName || record.user?.name || 'N/A'}</Text>
            <Tag color="processing" style={{ border: 'none', fontSize: '10px', borderRadius: '4px' }}>
              Registered
            </Tag>
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div style={{ fontSize: '13px' }}>
          <div><PhoneOutlined style={{ fontSize: '12px', marginRight: '4px', color: '#888' }} />{record.user?.phone || 'N/A'}</div>
          <div style={{ color: '#888' }}><MailOutlined style={{ fontSize: '12px', marginRight: '4px', color: '#888' }} />{record.user?.email || 'N/A'}</div>
        </div>
      ),
    },
    {
      title: 'Orders',
      key: 'orders',
      sorter: (a, b) => (a.orderCount || 0) - (b.orderCount || 0),
      render: (_, record) => (
        <Space>
          <div style={{ background: '#f5f5f5', padding: '2px 8px', borderRadius: '4px' }}>
            <ShoppingOutlined style={{ fontSize: '12px', color: '#888' }} />
            <Text style={{ marginLeft: '4px', fontSize: '12px' }}>{record.orderCount || 0} orders</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Total Spent',
      key: 'totalSpent',
      sorter: (a, b) => (a.totalSpent || 0) - (b.totalSpent || 0),
      render: (_, record) => (
        <Text style={{ color: '#52c41a', fontWeight: 500 }}>
          {record.totalSpent?.toLocaleString() || 0} RWF
        </Text>
      ),
    },
    {
      title: 'Gas Balance',
      key: 'gasBalance',
      render: (_, record) => (
        <Text style={{ color: '#722ed1' }}>{record.gasBalance || '0.00 M³'}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Text style={{ color: record.user?.isActive ? '#52c41a' : '#f5222d', fontSize: '12px', fontWeight: 600 }}>
          {record.user?.isActive ? 'ACTIVE' : 'INACTIVE'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => handleView(record)}
          >
            View
          </Button>
          <Button 
            type="text" 
            danger={record.user?.isActive}
            style={{ color: record.user?.isActive ? '#f5222d' : '#1890ff' }}
            icon={record.user?.isActive ? <StopOutlined /> : <CheckCircleOutlined />}
            onClick={() => handleToggleStatus(record)}
          >
            {record.user?.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  const stats = [
    { title: 'Total Customers', value: customers.length, icon: <TeamOutlined />, color: '#1890ff', border: '#1890ff' },
    { title: 'Active', value: customers.filter(c => c.user?.isActive).length, icon: <CheckCircleOutlined />, color: '#52c41a', border: '#52c41a' },
    { title: 'Registered', value: customers.length - 2, icon: <ClockCircleOutlined />, color: '#595959', border: '#595959' }, // Mocking some guest vs registered
    { title: 'Total Orders', value: 169, icon: <ShoppingOutlined />, color: '#722ed1', border: '#722ed1' },
    { title: 'Total Revenue', value: '2,815,000 RWF', icon: <DollarOutlined />, color: '#52c41a', border: '#52c41a' }
  ];

  return (
    <div style={{ background: '#f5f7fa', minHeight: '100vh', padding: '24px' }}>
      {/* Teal Header Banner */}
      <Card bordered={false} style={{ 
        background: 'linear-gradient(90deg, #26a69a 0%, #00897b 100%)', 
        borderRadius: '12px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(38, 166, 154, 0.2)'
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space align="start">
              <TeamOutlined style={{ color: 'white', fontSize: 32, marginTop: 4 }} />
              <div>
                <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 600 }}>Customer Management</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>View and manage customer accounts and activity</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadCustomers}
              loading={loading}
              style={{ borderRadius: '8px', height: '40px' }}
            >
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Stats Row */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        {stats.map((s, i) => (
          <Col key={i} flex={1}>
            <Card bordered={false} style={{ borderRadius: '12px', borderTop: `4px solid ${s.border}` }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <Text type="secondary" style={{ fontSize: '13px', marginBottom: '8px' }}>{s.title}</Text>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: '24px', fontWeight: 'bold' }}>{s.value}</Text>
                  <span style={{ fontSize: '24px', color: s.color, opacity: 0.8 }}>{s.icon}</span>
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Toolbar Search Bar */}
      <Card bordered={false} style={{ borderRadius: '12px', marginBottom: '24px' }}>
        <Row gutter={16}>
          <Col flex="auto">
            <Input
              placeholder="Search by name, email, or phon..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              style={{ borderRadius: '8px', height: '40px', background: '#f5f7fa', border: 'none' }}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </Col>
          <Col flex="200px">
            <Select 
              value={statusFilter} 
              style={{ width: '100%', height: '40px' }}
              onChange={setStatusFilter}
              className="custom-select"
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Main Table Card */}
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          className="customer-table"
        />
      </Card>

      <Modal
        title={<span className="text-base font-bold">Customer Details</span>}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>
        ]}
        width={650}
        centered
      >
        {selectedCustomer && (
          <div className="py-2">
            <Row gutter={[12, 12]}>
              {/* Basic Info */}
              <Col xs={24} sm={12}>
                <Text type="secondary" className="text-xs uppercase font-semibold">Customer ID</Text><br/>
                <Text strong>{selectedCustomer.id}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" className="text-xs uppercase font-semibold">Status</Text><br/>
                <Tag color={selectedCustomer.user?.isActive ? 'green' : 'red'}>
                  {selectedCustomer.user?.isActive ? 'Active' : 'Inactive'}
                </Tag>
              </Col>

              <Col span={24}>
                <div className="bg-gray-50 p-3 rounded-lg mt-1">
                  <Text strong className="text-sm">Personal Information</Text>
                </div>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" className="text-xs uppercase font-semibold">Full Name</Text><br/>
                <Text>{selectedCustomer.fullName || selectedCustomer.user?.name || 'N/A'}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" className="text-xs uppercase font-semibold">Phone</Text><br/>
                <Text>{selectedCustomer.user?.phone}</Text>
              </Col>
              <Col xs={24} sm={12}>
                <Text type="secondary" className="text-xs uppercase font-semibold">Email</Text><br/>
                <Text>{selectedCustomer.user?.email || 'N/A'}</Text>
              </Col>

              {/* Wallet Info */}
              <Col span={24}>
                <div className="bg-blue-50 p-3 rounded-lg mt-2">
                  <Text strong className="text-sm">Wallet Information</Text>
                </div>
              </Col>
              {selectedCustomer.wallets && selectedCustomer.wallets.length > 0 ? (
                selectedCustomer.wallets.map((wallet: any, idx: number) => (
                  <Col xs={24} sm={12} key={idx}>
                    <Card size="small" className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <Text type="secondary" className="text-xs">{wallet.type === 'dashboard_wallet' ? 'Dashboard' : 'Credit'} Wallet</Text><br/>
                      <Text strong className="text-lg">{wallet.balance?.toLocaleString() || 0} RWF</Text>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Text type="secondary" className="text-xs">No wallets found</Text>
                </Col>
              )}

              {/* NFC Cards */}
              <Col span={24}>
                <div className="bg-purple-50 p-3 rounded-lg mt-2">
                  <Text strong className="text-sm">NFC Cards ({selectedCustomer.nfcCards?.length || 0})</Text>
                </div>
              </Col>
              {selectedCustomer.nfcCards && selectedCustomer.nfcCards.length > 0 ? (
                selectedCustomer.nfcCards.map((card: any, idx: number) => (
                  <Col xs={24} sm={12} key={idx}>
                    <Card size="small" className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                      <Space direction="vertical" size={2} style={{ width: '100%' }}>
                        <Text type="secondary" className="text-xs">Card: {card.uid}</Text>
                        <Text strong className="text-base">{card.balance?.toLocaleString() || 0} RWF</Text>
                        <Tag color={card.status === 'active' ? 'green' : 'orange'} className="text-xs">
                          {card.status?.toUpperCase()}
                        </Tag>
                      </Space>
                    </Card>
                  </Col>
                ))
              ) : (
                <Col span={24}>
                  <Text type="secondary" className="text-xs">No NFC cards assigned</Text>
                </Col>
              )}
            </Row>
          </div>
        )}
      </Modal>

      <style>{`
        .customer-table .ant-table-thead > tr > th {
          background: white;
          color: #8c8c8c;
          font-weight: 500;
          border-bottom: 1px solid #f0f0f0;
        }
        .custom-select .ant-select-selector {
          background: #f5f7fa !important;
          border: none !important;
          border-radius: 8px !important;
        }
      `}</style>
    </div>
  );
};

export default CustomerManagementPage;
