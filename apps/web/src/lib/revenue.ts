import { db } from '@/lib/db'

// Archiving a lead is an organizational action, independent of collected revenue.
export const revenuePaymentWhere = {
  status: 'paid',
  currency: 'MXN',
  order: { status: { not: 'cancelled' }, revenueExclusionReason: null },
} as const

export async function getMonthlyRevenue(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const result = await db.payment.aggregate({
    where: { ...revenuePaymentWhere, paidAt: { gte: start, lt: end } },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0
}

export async function getRevenueSummary(now = new Date()) {
  const eligibleOrders = {
    ...revenuePaymentWhere.order,
    payments: { some: { status: 'paid', currency: 'MXN' } },
  }
  const [monthRevenue, total, orderCount, customers, recentOrders] = await Promise.all([
    getMonthlyRevenue(now),
    db.payment.aggregate({ where: revenuePaymentWhere, _sum: { amount: true } }),
    db.order.count({ where: eligibleOrders }),
    db.order.findMany({ where: eligibleOrders, distinct: ['customerId'], select: { customerId: true } }),
    db.order.findMany({
      where: eligibleOrders,
      select: {
        id: true, orderCode: true, status: true, createdAt: true,
        customer: { select: { companyName: true } },
        payments: { where: { status: 'paid', currency: 'MXN' }, select: { amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ])
  const totalRevenue = total._sum.amount ?? 0
  return {
    monthRevenue, totalRevenue,
    avgOrderSize: orderCount ? totalRevenue / orderCount : 0,
    customers: customers.length,
    recentOrders: recentOrders.map(({ payments, ...order }) => ({
      ...order, paidAmount: payments.reduce((sum, payment) => sum + payment.amount, 0),
    })),
  }
}
