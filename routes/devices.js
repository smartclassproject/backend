const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/devices');
const { validateDevice, validateDeviceUpdate } = require('../middlewares/validation');
const { authorize } = require('../middlewares/auth');

/**
 * @swagger
 * /api/devices:
 *   get:
 *     summary: Get all devices with pagination and filtering
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by device ID, name, or location
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: Filter by school ID
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', authorize('super_admin', 'school_admin'), deviceController.getAllDevices);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     summary: Get device by ID
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Device'
 *       404:
 *         description: Device not found
 */
router.get('/:id', authorize('super_admin', 'school_admin'), deviceController.getDeviceById);

/**
 * @swagger
 * /api/devices:
 *   post:
 *     summary: Create a new device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - schoolId
 *               - classroom
 *               - location
 *             properties:
 *               schoolId:
 *                 type: string
 *                 description: The school ID this device belongs to
 *                 example: "507f1f77bcf86cd799439011"
 *               classroom:
 *                 type: string
 *                 description: The classroom where the device is installed
 *                 example: "Room 101"
 *               location:
 *                 type: string
 *                 description: The physical location description of the device
 *                 example: "Main entrance, left side"
 *               isActive:
 *                 type: boolean
 *                 description: Whether the device is currently active
 *                 default: true
 *                 example: true
 *               deviceType:
 *                 type: string
 *                 description: The type of RFID device
 *                 default: "RFID Reader"
 *                 example: "RFID Reader"
 *               serialNumber:
 *                 type: string
 *                 description: The device serial number
 *                 example: "RFID-2024-001"
 *               model:
 *                 type: string
 *                 description: The device model
 *                 example: "RFID-2000"
 *               manufacturer:
 *                 type: string
 *                 description: The device manufacturer
 *                 default: "US"
 *                 example: "US"
 *               firmwareVersion:
 *                 type: string
 *                 description: The firmware version of the device
 *                 example: "v2.1.0"
 *               status:
 *                 type: string
 *                 enum: [Operational, Maintenance, Offline, Error]
 *                 description: The current status of the device
 *                 default: "Operational"
 *                 example: "Operational"
 *               batteryLevel:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Battery level percentage
 *                 default: 100
 *                 example: 85
 *               signalStrength:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Signal strength percentage
 *                 example: 95
 *               notes:
 *                 type: string
 *                 description: Additional notes about the device
 *                 example: "Installed for RFID attendance system"
 *     responses:
 *       201:
 *         description: Device created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Device created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Device'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Internal server error
 */
router.post('/', authorize('super_admin', 'school_admin'), validateDevice, deviceController.createDevice);

/**
 * @swagger
 * /api/devices/{id}:
 *   put:
 *     summary: Update device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               classroom:
 *                 type: string
 *                 description: The classroom where the device is installed
 *                 example: "Room 101"
 *               location:
 *                 type: string
 *                 description: The physical location description of the device
 *                 example: "Main entrance, left side"
 *               isActive:
 *                 type: boolean
 *                 description: Whether the device is currently active
 *                 example: true
 *               deviceType:
 *                 type: string
 *                 description: The type of RFID device
 *                 example: "RFID Reader"
 *               serialNumber:
 *                 type: string
 *                 description: The device serial number
 *                 example: "RFID-2024-001"
 *               model:
 *                 type: string
 *                 description: The device model
 *                 example: "RFID-2000"
 *               manufacturer:
 *                 type: string
 *                 description: The device manufacturer
 *                 example: "US"
 *               firmwareVersion:
 *                 type: string
 *                 description: The firmware version of the device
 *                 example: "v2.1.0"
 *               status:
 *                 type: string
 *                 enum: [Operational, Maintenance, Offline, Error]
 *                 description: The current status of the device
 *                 example: "Operational"
 *               batteryLevel:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Battery level percentage
 *                 example: 85
 *               signalStrength:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Signal strength percentage
 *                 example: 95
 *               notes:
 *                 type: string
 *                 description: Additional notes about the device
 *                 example: "Updated firmware to v2.1.0"
 *     responses:
 *       200:
 *         description: Device updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Device updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Device'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Device not found
 *       500:
 *         description: Internal server error
 */
router.put('/:id', authorize('super_admin', 'school_admin'), validateDeviceUpdate, deviceController.updateDevice);

/**
 * @swagger
 * /api/devices/{id}:
 *   delete:
 *     summary: Delete device
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device deleted successfully
 *       404:
 *         description: Device not found
 */
router.delete('/:id', authorize('super_admin', 'school_admin'), deviceController.deleteDevice);

/**
 * @swagger
 * /api/devices/{id}/toggle-status:
 *   patch:
 *     summary: Toggle device active status
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device status updated successfully
 *       404:
 *         description: Device not found
 */
router.patch('/:id/toggle-status', authorize('super_admin', 'school_admin'), deviceController.toggleDeviceStatus);

/**
 * @swagger
 * /api/devices/{id}/heartbeat:
 *   post:
 *     summary: Update device heartbeat
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     responses:
 *       200:
 *         description: Device heartbeat updated successfully
 *       404:
 *         description: Device not found
 */
router.post('/:id/heartbeat', authorize('super_admin', 'school_admin'), deviceController.updateHeartbeat);

/**
 * @swagger
 * /api/devices/check-in/{deviceId}:
 *   post:
 *     summary: Process RFID check-in
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cardId
 *             properties:
 *               cardId:
 *                 type: string
 *                 description: RFID card ID
 *     responses:
 *       200:
 *         description: Check-in processed successfully
 *       400:
 *         description: Invalid card or device
 *       404:
 *         description: Device not found
 */
/**
 * @swagger
 * /api/devices/school/devices:
 *   get:
 *     summary: Get all devices in a school (school admin only)
 *     tags: [Devices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by serial number, classroom, location, or device type
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Operational, Maintenance, Offline, Error]
 *         description: Filter by device status
 *       - in: query
 *         name: classroom
 *         schema:
 *           type: string
 *         description: Filter by classroom
 *     responses:
 *       200:
 *         description: Successfully retrieved school devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Device'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Access denied. School admin role required."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.get('/school/devices', authorize('school_admin'), deviceController.getSchoolDevices);

router.post('/check-in/:deviceId', deviceController.processCheckIn);

module.exports = router; 