import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Table,
  Statistic,
  message,
  Tabs,
  Alert,
} from 'antd';
import {
  WalletOutlined,
  CreditCardOutlined,
  HistoryOutlined,
  PlusOutlined,
  MobileOutlined,
  FileTextOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { consumerApi } from '../../services/apiService';

const { Title, Text } = Typography;

// Updated Types for 3-balance structure
interface WalletBalance {
  dashboardBalance: number;
  creditBalance: number;
  availableBalance: number; // dashboardBalance + creditBalance
  currency: string;
}

interface Transaction {
  id: string;
  type: 'top_up' | 'gas_payment' | 'order_payment' | 'refund' | 'credit_payment' | 'loan_disbursement';
  amount: number;
  balance_type: 'dashboard' | 'credit';
  description: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  merchant_name?: string;
  meter_id?: string;
  order_id?: string;
  reference_number?: string;
}

interface CreditInfo {
  credit_limit: number;
  available_credit: number;
  used_credit: number;
  outstanding_balance: number;
  payment_status: 'current' | 'overdue' | 'pending';
  next_payment_date?: string;
  next_payment_amount?: number;
}

interface CreditOrder {
  id: string;
  order_number: string;
  amount: number;
  date: string;
  status: string;
}

interface CreditApproval {
  id: string;
  amount_requested: number;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at?: string;
  reason?: string;
}

const ConsumerWalletPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditInfo, setCreditInfo] = useState<CreditInfo | null>(null);
  const [creditOrders, setCreditOrders] = useState<CreditOrder[]>([]);
  const [creditApprovals, setCreditApprovals] = useState<CreditApproval[]>([]);
  
  // Modals
  const [topUpModalVisible, setTopUpModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [loanModalVisible, setLoanModalVisible] = useState(false);
  
  const [activeTab, setActiveTab] = useState('transactions');

  const [topUpForm] = Form.useForm();
  const [refundForm] = Form.useForm();
  const [loanForm] = Form.useForm();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletsRes, transactionsRes, loansRes] = await Promise.all([
        consumerApi.getWallets(),
        consumerApi.getWalletTransactions({ limit: 50 }),
        consumerApi.getLoans(),
      ]);

      if (walletsRes.data.success) {
        const wallets = walletsRes.data.data;
        const dashboardWallet = wallets.find((w: any) => w.type === 'dashboard_wallet');
        const creditWallet = wallets.find((w: any) => w.type === 'credit_wallet');

        const dashboardBalance = dashboardWallet?.balance || 0;
        const creditBalance = creditWallet?.balance || 0;

        setBalance({
          dashboardBalance,
          creditBalance,
          availableBalance: dashboardBalance + creditBalance,
          currency: 'RWF',
        });
      }

      if (transactionsRes.data.success) {
        const transformedTransactions: Transaction[] = transactionsRes.data.data.map((t: any) => ({
          id: t.id,
          type: t.type as any,
          amount: t.amount,
          balance_type: t.wallet_type === 'dashboard_wallet' ? 'dashboard' : 'credit',
          description: t.description,
          status: t.status,
          created_at: t.created_at,
          reference_number: t.reference,
        }));
        setTransactions(transformedTransactions);
      }

      // Process Loans
      if (loansRes.data.loans) {
           const activeLoans = loansRes.data.loans;
           setCreditApprovals(activeLoans.map((l: any) => ({
             id: l.id,
             amount_requested: l.amount,
             status: l.status,
             submitted_at: l.createdAt,
             reason: 'Loan Request'
           })));

           const usedCredit = activeLoans.reduce((sum: number, l: any) => sum + l.amount, 0);
           const creditLimit = 50000;

           setCreditInfo({
             credit_limit: creditLimit,
             available_credit: creditLimit - usedCredit,
             used_credit: usedCredit,
             outstanding_balance: usedCredit,
             payment_status: 'current',
             next_payment_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
           });
      }

    } catch (error) {
      console.error('Failed to load wallet data:', error);
      message.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const handleTopUp = async (values: any) => {
      try {
          setLoading(true);
          const response = await consumerApi.topupWallet({
              amount: values.amount,
              payment_method: values.payment_method || 'mobile_money',
          });
          if (response.data.success) {
              message.success('Top-up successful');
              setTopUpModalVisible(false);
              topUpForm.resetFields();
              loadData();
          }
      } catch (error: any) {
          message.error(error.response?.data?.error || 'Top-up failed');
      } finally {
          setLoading(false);
      }
  };

  const handleRefundRequest = async (values: any) => {
      try {
           setLoading(true);
           await consumerApi.requestRefund(values);
           message.success('Refund request submitted');
           setRefundModalVisible(false);
           refundForm.resetFields();
      } catch (error: any) {
           message.error('Failed to submit refund');
      } finally {
           setLoading(false);
      }
  };

  const handleLoanRequest = async (values: any) => {
       try {
           setLoading(true);
           const loanProduct = await consumerApi.getLoanProducts();
           let product = loanProduct.data.products?.find((p: any) => p.loan_type === 'cash');
           await consumerApi.applyForLoan({
               loan_product_id: product?.id || 'lp_2',
               amount: values.amount,
               purpose: values.purpose
           });
           message.success('Loan application submitted');
           setLoanModalVisible(false);
           loanForm.resetFields();
           loadData();
       } catch (error: any) {
           message.error('Failed to submit loan');
       } finally {
           setLoading(false);
       }
  };

  const transactionColumns: ColumnsType<Transaction> = [
      {
        title: 'Date',
        dataIndex: 'created_at',
        key: 'created_at',
        render: (date) => new Date(date).toLocaleDateString(),
        width: 100,
      },
      {
        title: 'Description',
        key: 'description',
        render: (_, record) => (
          <Space direction="vertical" size={0}>
            <Text>{record.description}</Text>
            {record.merchant_name && (
              <Text type="secondary" style={{ fontSize: 12 }}>{record.merchant_name}</Text>
            )}
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.balance_type === 'dashboard' ? 'Dashboard' : 'Credit'}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Type',
        dataIndex: 'type',
        key: 'type',
        render: (type) => {
          const config: Record<string, { color: string; label: string }> = {
            order_payment: { color: 'red', label: 'Purchase' },
            gas_payment: { color: 'orange', label: 'Gas' },
            top_up: { color: 'green', label: 'Top-up' },
            refund: { color: 'cyan', label: 'Refund' },
            loan_disbursement: { color: 'purple', label: 'Loan' },
            credit_payment: { color: 'blue', label: 'Credit' },
          };
          const { color, label } = config[type] || { color: 'default', label: type };
          return <Tag color={color}>{label}</Tag>;
        },
        width: 100,
      },
      {
        title: 'Amount',
        dataIndex: 'amount',
        key: 'amount',
        render: (amount) => (
          <Text strong style={{ color: amount > 0 ? '#52c41a' : '#ff4d4f' }}>
            {amount > 0 ? '+' : ''}{amount.toLocaleString()} RWF
          </Text>
        ),
        align: 'right',
        width: 120,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => {
          const color = status === 'completed' ? 'success' : status === 'pending' ? 'warning' : 'error';
          return <Tag color={color}>{status}</Tag>;
        },
        width: 100,
      },
  ];

  return (
      <div style={{ padding: '16px' }} className="wallet-page">
          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
              <Col flex="auto">
                  <Title level={3} style={{ margin: 0 }}>
                      <WalletOutlined style={{ marginRight: 12 }} />
                      Wallet
                  </Title>
                  <Text type="secondary">Manage your Dashboard and Credit balances</Text>
              </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
               {/* Dashboard Balance */}
               <Col xs={24} md={12}>
                   <Card>
                       <Statistic title="Dashboard Balance" value={balance?.dashboardBalance} precision={0} suffix="RWF" prefix={<WalletOutlined />} valueStyle={{color: '#1890ff'}} />
                       <Space style={{marginTop: 16}}>
                           <Button type="primary" onClick={() => setTopUpModalVisible(true)}>Top Up</Button>
                           <Button onClick={() => setRefundModalVisible(true)}>Refund</Button>
                       </Space>
                   </Card>
               </Col>
               {/* Credit Balance */}
               <Col xs={24} md={12}>
                   <Card>
                       <Statistic title="Credit Balance" value={balance?.creditBalance} precision={0} suffix="RWF" prefix={<CreditCardOutlined />} valueStyle={{color: '#52c41a'}} />
                       <div style={{marginTop: 16}}>
                          <Button onClick={() => setLoanModalVisible(true)}>Request Loan</Button>
                       </div>
                   </Card>
               </Col>
          </Row>

          <Alert
            message="Access your wallet via USSD"
            description={
              <span>Dial <Text strong code>*939#</Text> from your registered phone to check balance without internet.</span>
            }
            type="info"
            showIcon
            icon={<MobileOutlined />}
            style={{ marginBottom: 24 }}
          />

          <Card>
              <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  items={[
                      {
                          key: 'transactions',
                          label: <span><HistoryOutlined /> Transactions</span>,
                          children: (
                              <Table
                                  columns={transactionColumns}
                                  dataSource={transactions}
                                  rowKey="id"
                                  loading={loading}
                                  pagination={{ pageSize: 10 }}
                              />
                          )
                      }
                  ]}
              />
          </Card>

          <Modal title="Top Up Wallet" open={topUpModalVisible} onCancel={() => setTopUpModalVisible(false)} footer={null}>
              <Form form={topUpForm} onFinish={handleTopUp} layout="vertical">
                  <Form.Item name="amount" label="Amount (RWF)" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} min={100} />
                  </Form.Item>
                  <Form.Item name="payment_method" label="Payment Method" initialValue="mobile_money">
                      <Select>
                          <Select.Option value="mobile_money">Mobile Money</Select.Option>
                      </Select>
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>Top Up</Button>
              </Form>
          </Modal>

          <Modal title="Request Refund" open={refundModalVisible} onCancel={() => setRefundModalVisible(false)} footer={null}>
              <Form form={refundForm} onFinish={handleRefundRequest} layout="vertical">
                  <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} min={100} max={balance?.dashboardBalance} />
                  </Form.Item>
                  <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
                      <Input.TextArea />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>Submit Request</Button>
              </Form>
          </Modal>

          <Modal title="Request Loan" open={loanModalVisible} onCancel={() => setLoanModalVisible(false)} footer={null}>
               <Form form={loanForm} onFinish={handleLoanRequest} layout="vertical">
                  <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
                      <InputNumber style={{ width: '100%' }} min={1000} max={creditInfo?.available_credit} />
                  </Form.Item>
                  <Form.Item name="purpose" label="Purpose">
                      <Input />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>Apply</Button>
               </Form>
          </Modal>
      </div>
  );
};

export default ConsumerWalletPage;
