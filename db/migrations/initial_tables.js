export function up(pgm) {
    pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    pgm.createTable('users', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        username: { type: 'varchar(50)', notNull: true, unique: true },
        password_hash: { type: 'text', notNull: true },
        created_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });

    pgm.addType('message_status', ['pending', 'sent', 'delivered', 'read', 'failed']);

    pgm.createTable('messages', {
        id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
        sender_id: {
            type: 'uuid',
            notNull: true,
            references: '"users"',
            onDelete: 'CASCADE',
        },
        receiver_id: {
            type: 'uuid',
            notNull: true,
            references: '"users"',
            onDelete: 'CASCADE',
        },
        content: { type: 'text', notNull: true },
        status: { type: 'message_status', default: 'pending' },
        sent_at: {
            type: 'timestamptz',
            notNull: true,
            default: pgm.func('current_timestamp'),
        },
    });
}

export function down(pgm) {
    pgm.dropTable('messages');
    pgm.dropType('message_status');
    pgm.dropTable('users');
}