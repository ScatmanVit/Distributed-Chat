SELECT 
  u1.username AS de,
  u2.username AS para,
  m.content,
  m.sent_at
FROM messages m
JOIN users u1 ON m.sender_id = u1.id
JOIN users u2 ON m.receiver_id = u2.id
WHERE 
  (u1.username = 'alice' AND u2.username = 'bob')
  OR 
  (u1.username = 'bob' AND u2.username = 'alice')
ORDER BY m.sent_at ASC;