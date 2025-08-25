const Device = require('../models/Device');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const School = require('../models/School');
const { sendResponse, sendError } = require('../utils/response');

/**
 * Get all devices with pagination and filtering
 */
const getAllDevices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      schoolId = '',
      isActive = ''
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { classroom: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { deviceType: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (schoolId) {
      filter.schoolId = schoolId;
    } else if (req.user.role === 'school_admin') {
      // School admins can only see devices from their school
      filter.schoolId = req.user.schoolId;
    }
    
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Get total count
    const total = await Device.countDocuments(filter);
    
    // Get devices with pagination
    const devices = await Device.find(filter)
      .populate('schoolId', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const pages = Math.ceil(total / limit);

    return sendResponse(res, 200, {
      data: devices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    console.log("Error fetching devices", error);
    // return sendError(res, 500, 'Error fetching devices', error);
  }
};

/**
 * Get device by ID
 */
const getDeviceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const device = await Device.findById(id).populate('schoolId', 'name location');

    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    // Check if user has permission to view this device
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== device.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    sendResponse(res, 200, { data: device });
  } catch (error) {
    sendError(res, 500, 'Error fetching device', error);
  }
};

/**
 * Create new device
 */
const createDevice = async (req, res) => {
  try {
    const {
      schoolId,
      classroom,
      location,
      deviceType,
      serialNumber,
      model,
      manufacturer,
      firmwareVersion,
      status,
      batteryLevel,
      signalStrength,
      notes
    } = req.body;

    // Check if serialNumber already exists
    if (serialNumber) {
      const existingDevice = await Device.findOne({ serialNumber });
      if (existingDevice) {
        return sendError(res, 400, 'Serial number already exists');
      }
    }

    // Set schoolId based on user role
    let targetSchoolId = schoolId;
    if (req.user.role === 'school_admin') {
      targetSchoolId = req.user.schoolId;
    }

    // Verify school exists
    const school = await School.findById(targetSchoolId);
    if (!school) {
      return sendError(res, 400, 'School not found');
    }

    // Create device
    const device = new Device({
      schoolId: targetSchoolId,
      classroom,
      location,
      deviceType,
      serialNumber,
      model,
      manufacturer,
      firmwareVersion,
      status,
      batteryLevel,
      signalStrength,
      notes
    });

    await device.save();

    const populatedDevice = await Device.findById(device._id).populate('schoolId', 'name location');

    return sendResponse(res, 201, { 
      data: populatedDevice,
      message: 'Device created successfully'
    });
    
  } catch (error) {
    sendError(res, 500, 'Error creating device', error);
  }
};

/**
 * Update device
 */
const updateDevice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const device = await Device.findById(id);
    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    // Check if user has permission to update this device
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== device.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    // Check if serialNumber is being updated and if it already exists
    if (updateData.serialNumber && updateData.serialNumber !== device.serialNumber) {
      const existingDevice = await Device.findOne({ 
        serialNumber: updateData.serialNumber,
        _id: { $ne: id }
      });
      if (existingDevice) {
        return sendError(res, 400, 'Serial number already exists');
      }
    }

    // Prevent changing schoolId for school admins
    if (req.user.role === 'school_admin' && updateData.schoolId) {
      delete updateData.schoolId;
    }

    // Update device
    const updatedDevice = await Device.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('schoolId', 'name location');

    sendResponse(res, 200, { 
      data: updatedDevice,
      message: 'Device updated successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error updating device', error);
  }
};

/**
 * Delete device
 */
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    // Check if user has permission to delete this device
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== device.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    await Device.findByIdAndDelete(id);

    sendResponse(res, 200, { 
      message: 'Device deleted successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error deleting device', error);
  }
};

/**
 * Toggle device active status
 */
const toggleDeviceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    // Check if user has permission to update this device
    if (req.user.role === 'school_admin' && req.user.schoolId.toString() !== device.schoolId.toString()) {
      return sendError(res, 403, 'Access denied');
    }

    device.isActive = !device.isActive;
    await device.save();

    sendResponse(res, 200, { 
      data: { isActive: device.isActive },
      message: `Device ${device.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    sendError(res, 500, 'Error toggling device status', error);
  }
};

/**
 * Update device heartbeat
 */
const updateHeartbeat = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findById(id);
    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    device.lastSeen = new Date();
    await device.save();

    sendResponse(res, 200, { 
      data: { lastSeen: device.lastSeen },
      message: 'Device heartbeat updated successfully'
    });
  } catch (error) {
    sendError(res, 500, 'Error updating device heartbeat', error);
  }
};

/**
 * Process RFID check-in
 */
const processCheckIn = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { cardId } = req.body;

    if (!cardId) {
      return sendError(res, 400, 'Card ID is required');
    }

    // Find device by ID (deviceId parameter is actually the device's _id)
    const device = await Device.findById(deviceId);
    if (!device) {
      return sendError(res, 404, 'Device not found');
    }

    if (!device.isActive) {
      return sendError(res, 400, 'Device is not active');
    }

    // Find student by card ID
    const student = await Student.findOne({ 
      rfidCardId: cardId,
      schoolId: device.schoolId,
      isActive: true
    });

    if (!student) {
      return sendError(res, 400, 'Invalid card or student not found');
    }

    // Check if student is already checked in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingAttendance = await Attendance.findOne({
      studentId: student._id,
      date: {
        $gte: today,
        $lt: tomorrow
      }
    });

    if (existingAttendance) {
      return sendError(res, 400, 'Student already checked in today');
    }

    // Create attendance record
    const attendance = new Attendance({
      studentId: student._id,
      deviceId: device._id,
      schoolId: device.schoolId,
      date: new Date(),
      checkInTime: new Date(),
      status: 'present'
    });

    await attendance.save();

    // Update device last seen
    device.lastSeen = new Date();
    await device.save();

    sendResponse(res, 200, { 
      data: {
        student: {
          id: student._id,
          name: `${student.firstName} ${student.lastName}`,
          studentId: student.studentId
        },
        attendance: {
          id: attendance._id,
          checkInTime: attendance.checkInTime,
          status: attendance.status
        }
      },
      message: 'Check-in successful'
    });
  } catch (error) {
    sendError(res, 500, 'Error processing check-in', error);
  }
};

/**
 * Get all devices in a school (school admin only)
 */
const getSchoolDevices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      isActive = '',
      status = '',
      classroom = ''
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter object - school admins can only see devices from their school
    const filter = {
      schoolId: req.user.schoolId
    };
    
    if (search) {
      filter.$or = [
        { serialNumber: { $regex: search, $options: 'i' } },
        { classroom: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { deviceType: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    if (status) {
      filter.status = status;
    }

    if (classroom) {
      filter.classroom = { $regex: classroom, $options: 'i' };
    }

    // Get total count
    const total = await Device.countDocuments(filter);
    
    // Get devices with pagination
    const devices = await Device.find(filter)
      .populate('schoolId', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const pages = Math.ceil(total / limit);

    return sendResponse(res, 200, {
      data: devices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    console.log("Error fetching school devices", error);
    return sendError(res, 500, 'Error fetching school devices', error);
  }
};

module.exports = {
  getAllDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleDeviceStatus,
  updateHeartbeat,
  processCheckIn,
  getSchoolDevices
}; 