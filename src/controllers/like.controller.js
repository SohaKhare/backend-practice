import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const videoExists = await Video.findById(videoId);
  if (!videoExists) {
    throw new ApiError(404, "Video not found");
  }

  const existingLike = await Like.findOne({
    likedBy: userId,
    video: videoId,
  });

  let message = "";
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    message = "Video unliked successfully";
  } else {
    await Like.create({
      video: videoId,
      likedBy: userId,
    });
    message = "Video liked successfully";
  }

  return res.status(200).json(new ApiResponse(200, {}, message));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  const commentExists = await Comment.findById(commentId);
  if (!commentExists) {
    throw new ApiError(404, "Comment not found");
  }

  const existingLike = await Like.findOne({
    likedBy: userId,
    comment: commentId,
  });

  let message = "";
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    message = "Comment unliked successfully";
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });
    message = "Comment liked successfully";
  }

  return res.status(200).json(new ApiResponse(200, {}, message));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  const tweetExists = await Tweet.findById(tweetId);
  if (!tweetExists) {
    throw new ApiError(404, "Tweet not found");
  }

  const existingLike = await Like.findOne({
    likedBy: userId,
    tweet: tweetId,
  });

  let message = "";
  if (existingLike) {
    await Like.deleteOne({ _id: existingLike._id });
    message = "Tweet unliked successfully";
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
    message = "Tweet liked successfully";
  }

  return res.status(200).json(new ApiResponse(200, {}, message));
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $exists: true, $ne: null },
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $unwind: {
        path: "$videoDetails",
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $project: {
        _id: "$videoDetails._id",
        videoFile: "$videoDetails.videoFile",
        thumbnail: "$videoDetails.thumbnail",
        title: "$videoDetails.title",
        duration: "$videoDetails.duration",
        views: "$videoDetails.views",
        owner: "$videoDetails.owner",
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
