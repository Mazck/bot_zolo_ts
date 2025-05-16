/**
 * File: src/webserver/routes/api.ts
 * Mô tả: Thiết lập các API nội bộ
 */

import { Express } from 'express';
import { findAllGroups, findGroupById } from '../../database/models/group';
import { findAllUsers, findUserById } from '../../database/models/user';
import { findAllPayments } from '../../database/models/payment';
import { SUBSCRIPTION_PACKAGES } from '../../config';
import global from '../../global';

/**
 * Thiết lập các route API nội bộ
 * @param app Express app instance
 */
export function setupAPIRoutes(app: Express) {
    const router = app.router;

    // API endpoints

    // Lấy thông tin bot
    app.get('/api/bot/info', async (req, res) => {
        try {
            if (!global.bot) {
                return res.status(503).json({ error: 'Bot chưa được khởi tạo' });
            }

            const botId = global.bot.id;
            const commandCount = global.commands?.size || 0;

            return res.json({
                id: botId,
                name: process.env.BOT_NAME,
                commandCount,
                uptime: process.uptime()
            });
        } catch (error) {
            global.logger.error(`Lỗi API /bot/info: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy danh sách nhóm
    app.get('/api/groups', async (req, res) => {
        try {
            const groups = await findAllGroups();
            return res.json({ groups });
        } catch (error) {
            global.logger.error(`Lỗi API /groups: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thông tin nhóm cụ thể
    app.get('/api/groups/:id', async (req, res) => {
        try {
            const group = await findGroupById(req.params.id);

            if (!group) {
                return res.status(404).json({ error: 'Không tìm thấy nhóm' });
            }

            return res.json({ group });
        } catch (error) {
            global.logger.error(`Lỗi API /groups/:id: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy danh sách người dùng
    app.get('/api/users', async (req, res) => {
        try {
            const users = await findAllUsers();
            return res.json({ users });
        } catch (error) {
            global.logger.error(`Lỗi API /users: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thông tin người dùng cụ thể
    app.get('/api/users/:id', async (req, res) => {
        try {
            const user = await findUserById(req.params.id);

            if (!user) {
                return res.status(404).json({ error: 'Không tìm thấy người dùng' });
            }

            return res.json({ user });
        } catch (error) {
            global.logger.error(`Lỗi API /users/:id: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy danh sách thanh toán
    app.get('/api/payments', async (req, res) => {
        try {
            const payments = await findAllPayments();
            return res.json({ payments });
        } catch (error) {
            global.logger.error(`Lỗi API /payments: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thông tin gói dịch vụ
    app.get('/api/packages', (req, res) => {
        try {
            return res.json({ packages: SUBSCRIPTION_PACKAGES });
        } catch (error) {
            global.logger.error(`Lỗi API /packages: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thống kê
    app.get('/api/stats', async (req, res) => {
        try {
            const groups = await findAllGroups();
            const users = await findAllUsers();
            const payments = await findAllPayments();

            const activeGroups = groups.filter(group => group.isActive);
            const totalRevenue = payments
                .filter(payment => payment.status === 'completed')
                .reduce((sum, payment) => sum + payment.amount, 0);

            return res.json({
                stats: {
                    totalGroups: groups.length,
                    activeGroups: activeGroups.length,
                    totalUsers: users.length,
                    totalPayments: payments.length,
                    totalRevenue
                }
            });
        } catch (error) {
            global.logger.error(`Lỗi API /stats: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });
}