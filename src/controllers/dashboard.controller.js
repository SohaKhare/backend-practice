import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model";

const getChannelStats = asyncHandler(async (req, res) => {
  const channelId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid Channel ID");
  }

  const totalVideos = await Video.countDocuments({ owner: channelId });

  const totalViewsData = await Video.aggregate([
    {
      $match: {
        owner: channelId,
      },
    },
    {
      $group: {
        _id: null,
        totalViews: {
          $sum: "$views",
        },
      },
    },
  ]);
  const totalViews = totalViewsData[0]?.totalVideos || 0;

  const totalSubscribers = await Subscription.countDocuments({
    channel: channelId,
  });

  const totalLikes = await Like.countDocuments({
    video: { $in: await Video.find({ owner: channelId }).distinct("_id") },
  });

  const stats = {
    totalVideos,
    totalViews,
    totalSubscribers,
    totalLikes,
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, stats, "Channel statistics fetched successfully")
    );
});

const getChannelVideos = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username || username.trim() === "") {
    throw new ApiError(400, "Username is required");
  }

  const channel = await User.findOne({ username: username.toLowerCase() });
  if (!channel) {
    throw new ApiError(404, "Cannot find channel with that username");
  }

  const videos = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(channel._id),
      },
    },
    {
      $sort: { createdAt: -1 },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videos,
        "Videos created by this channel fetched successfully"
      )
    );
});

export { getChannelStats, getChannelVideos };
