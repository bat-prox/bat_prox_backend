const db = require('../config/db');

const getDashboardData = async () => {
  const [[summaryRows], [activityRows]] = await Promise.all([
    db.query(`
      SELECT
        SUM(CASE WHEN t.type = 'deposit'  AND t.status = 'pending' THEN 1 ELSE 0 END) AS depositPending,
        SUM(CASE WHEN t.type = 'withdraw' AND t.status = 'pending' THEN 1 ELSE 0 END) AS withdrawPending,
        0 AS activeUsers,
        0 AS totalUsers
      FROM transactions t
      UNION ALL
      SELECT
        0, 0,
        SUM(CASE WHEN COALESCE(status, 'active') = 'active' AND COALESCE(role, 'user') <> 'admin' THEN 1 ELSE 0 END),
        SUM(CASE WHEN COALESCE(role, 'user') <> 'admin' THEN 1 ELSE 0 END)
      FROM users
    `),
    db.query(`
      SELECT a.id, a.type, a.amount, a.user_id, a.status, a.created_at, u.name AS user_name
      FROM (
        SELECT id, 'deposit' AS type, amount, user_id, status, created_at
        FROM transactions
        WHERE type = 'deposit'

        UNION ALL

        SELECT id, 'withdraw' AS type, amount, user_id, status, created_at
        FROM transactions
        WHERE type = 'withdraw'

        UNION ALL

        SELECT id, 'user' AS type, NULL AS amount, id AS user_id, COALESCE(status, 'active') AS status, created_at
        FROM users
        WHERE COALESCE(role, 'user') <> 'admin'
      ) AS a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.created_at DESC
      LIMIT 10
    `)
  ]);

  const txRow    = summaryRows[0] || {};
  const userRow  = summaryRows[1] || {};

  const summary = {
    depositPending:  Number(txRow.depositPending  || 0),
    withdrawPending: Number(txRow.withdrawPending || 0),
    activeUsers:     Number(userRow.activeUsers   || 0),
    totalUsers:      Number(userRow.totalUsers    || 0)
  };

  const recentActivity = activityRows.map(row => ({
    id:         row.id,
    type:       row.type,
    amount:     row.amount !== null ? Number(row.amount) : null,
    user_id:    row.user_id,
    user_name:  row.user_name || null,
    status:     row.status,
    created_at: row.created_at
  }));

  return { summary, recentActivity };
};

module.exports = { getDashboardData };
