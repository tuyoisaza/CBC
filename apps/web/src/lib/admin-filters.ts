// Shared by dashboard counts and their destination lists.
export const openLeadsWhere = {
  archivedAt: null,
  status: { in: ['new', 'contacted', 'quoted'] },
}

export const activeOrdersWhere = {
  status: { in: ['confirmed', 'in_production', 'ready', 'shipped'] },
  revenueExclusionReason: null,
}

export const inboxMessagesWhere = { direction: 'inbound', deletedAt: null }
export const unreadMessagesWhere = { ...inboxMessagesWhere, status: 'unread' }
