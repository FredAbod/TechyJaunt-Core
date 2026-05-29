import mongoose from "mongoose";
import Progress from "../models/progress.js";
import User from "../../user/models/user.js";

/** Progress rows tied to a current, unexpired subscription. */
export const ACTIVE_SUBSCRIPTION_PROGRESS_STAGES = [
  {
    $lookup: {
      from: "subscriptions",
      localField: "subscriptionId",
      foreignField: "_id",
      as: "subscription",
    },
  },
  { $unwind: { path: "$subscription", preserveNullAndEmptyArrays: false } },
  {
    $match: {
      "subscription.status": "active",
      "subscription.endDate": { $gt: new Date() },
    },
  },
];

function emptyEnrollmentStats() {
  return {
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    overallProgress: 0,
  };
}

function formatEnrollmentGroup(row) {
  if (!row) return emptyEnrollmentStats();
  return {
    totalCourses: row.totalCourses || 0,
    completedCourses: row.completedCourses || 0,
    inProgressCourses: row.inProgressCourses || 0,
    overallProgress: Math.round(row.avgProgress || 0),
  };
}

/**
 * Enrollment stats for one student (active subscriptions only).
 */
export async function getStudentEnrollmentStats(userId) {
  const userObjectId =
    typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;

  const rows = await Progress.aggregate([
    { $match: { userId: userObjectId } },
    ...ACTIVE_SUBSCRIPTION_PROGRESS_STAGES,
    {
      $group: {
        _id: null,
        totalCourses: { $sum: 1 },
        completedCourses: {
          $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
        },
        inProgressCourses: {
          $sum: { $cond: [{ $eq: ["$isCompleted", false] }, 1, 0] },
        },
        avgProgress: { $avg: "$overallProgress" },
      },
    },
  ]);

  return formatEnrollmentGroup(rows[0]);
}

/**
 * Batch enrollment stats for many students (e.g. admin list page).
 */
export async function getEnrollmentStatsByUserIds(userIds) {
  if (!userIds?.length) return new Map();

  const objectIds = userIds.map((id) =>
    typeof id === "string" ? new mongoose.Types.ObjectId(id) : id,
  );

  const rows = await Progress.aggregate([
    { $match: { userId: { $in: objectIds } } },
    ...ACTIVE_SUBSCRIPTION_PROGRESS_STAGES,
    {
      $group: {
        _id: "$userId",
        totalCourses: { $sum: 1 },
        completedCourses: {
          $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
        },
        inProgressCourses: {
          $sum: { $cond: [{ $eq: ["$isCompleted", false] }, 1, 0] },
        },
        avgProgress: { $avg: "$overallProgress" },
      },
    },
  ]);

  const map = new Map();
  for (const id of objectIds) {
    map.set(id.toString(), emptyEnrollmentStats());
  }
  for (const row of rows) {
    map.set(row._id.toString(), formatEnrollmentGroup(row));
  }
  return map;
}

/**
 * Platform-wide stats for admin dashboard (aligned with active enrollments).
 */
export async function getPlatformStats() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [totalRegisteredUsers, enrollmentRows, totalActiveUsers] =
    await Promise.all([
      User.countDocuments({ role: "user" }),
      Progress.aggregate([
        ...ACTIVE_SUBSCRIPTION_PROGRESS_STAGES,
        {
          $group: {
            _id: null,
            totalActiveEnrollments: { $sum: 1 },
            totalCompletedEnrollments: {
              $sum: { $cond: [{ $eq: ["$isCompleted", true] }, 1, 0] },
            },
            totalInProgressEnrollments: {
              $sum: { $cond: [{ $eq: ["$isCompleted", false] }, 1, 0] },
            },
          },
        },
      ]),
      User.countDocuments({
        role: "user",
        lastLogin: { $gte: thirtyDaysAgo },
      }),
    ]);

  const enrollment = enrollmentRows[0] || {};
  const totalActiveEnrollments = enrollment.totalActiveEnrollments || 0;
  const totalCompletedEnrollments = enrollment.totalCompletedEnrollments || 0;
  const totalInProgressEnrollments = enrollment.totalInProgressEnrollments || 0;

  const activeUsersPercentage =
    totalRegisteredUsers > 0
      ? Math.round((totalActiveUsers / totalRegisteredUsers) * 100 * 10) / 10
      : 0;

  return {
    totalRegisteredUsers,
    totalActiveEnrollments,
    totalCompletedEnrollments,
    totalInProgressEnrollments,
    /** @deprecated Use totalCompletedEnrollments — same value, clearer meaning */
    totalCompletedCourses: totalCompletedEnrollments,
    totalActiveUsers,
    activeUsersPercentage,
  };
}

export default {
  getStudentEnrollmentStats,
  getEnrollmentStatsByUserIds,
  getPlatformStats,
  ACTIVE_SUBSCRIPTION_PROGRESS_STAGES,
};
