'use strict';

const { Router } = require('express');
const gamCtrl    = require('../controllers/gamificationController');
const { protect } = require('../middleware/auth');

const router = Router();

router.use(protect);

router.get('/',              gamCtrl.getGamification);
router.get('/weekly',        gamCtrl.getWeeklyActivity);
router.get('/calendar',      gamCtrl.getStreakCalendar);
router.get('/achievements',  gamCtrl.getAchievements);
router.get('/leaderboard',   gamCtrl.getLeaderboard);

module.exports = router;
