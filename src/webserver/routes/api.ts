/**
 * File: src/webserver/routes/api.ts
 * Mô tả: Thiết lập các API nội bộ
 */

import { Express, Request, Response } from 'express';
import { Router } from 'express'; // Import Router
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
    // Create a router instance instead of using app.router
    const router = Router();

    // API endpoints

    // Lấy thông tin bot
    router.get('/bot/info', async (req: Request, res: Response) => {
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
    router.get('/groups', async (req: Request, res: Response) => {
        try {
            const groups = await findAllGroups();
            return res.json({ groups });
        } catch (error) {
            global.logger.error(`Lỗi API /groups: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thông tin nhóm cụ thể
    router.get('/groups/:id', async (req: Request, res: Response) => {
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
    router.get('/users', async (req: Request, res: Response) => {
        try {
            const users = await findAllUsers();
            return res.json({ users });
        } catch (error) {
            global.logger.error(`Lỗi API /users: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thông tin người dùng cụ thể
    router.get('/users/:id', async (req: Request, res: Response) => {
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
    router.get('/payments', async (req: Request, res: Response) => {
        try {
            const payments = await findAllPayments();
            return res.json({ payments });
        } catch (error) {
            global.logger.error(`Lỗi API /payments: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thông tin gói dịch vụ
    router.get('/packages', (req: Request, res: Response) => {
        try {
            return res.json({ packages: SUBSCRIPTION_PACKAGES });
        } catch (error) {
            global.logger.error(`Lỗi API /packages: ${error}`);
            return res.status(500).json({ error: 'Lỗi máy chủ' });
        }
    });

    // Lấy thống kê
    router.get('/stats', async (req: Request, res: Response) => {
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

    // Use the router with the app
    app.use('/api', router);
}