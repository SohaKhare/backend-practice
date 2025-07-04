import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const filters = { isPublished: true };

  if (query.trim()) {
    filters.title = { $regex: query.trim(), $options: "i" };
  }

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID for filter");
  }

  if (userId) {
    filters.owner = new mongoose.Types.ObjectId(userId);
  }

  const sortOptions = { [sortBy]: sortType === "asc" ? 1 : -1 };

  const aggregateQuery = [
    {
      $match: filters,
    },
    {
      $sort: sortOptions,
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: "$ownerDetails",
    },
    {
      $project: {
        _id: 1,
        videoFile: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        duration: 1,
        views: 1,
        createdAt: 1,
        "ownerDetails._id": 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ];

  const options = {
    page: parseInt(page),
    limit: parseInt(limit),
  };

  const allVideos = await Video.aggregatePaginate(
    Video.aggregate(aggregateQuery),
    options
  );

  return res
    .status(200)
    .json(new ApiResponse(200, allVideos, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  if (!title || title.trim() === "") {
    throw new ApiError(400, "Title cannot be empty");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description cannot be empty");
  }

  const videoFileData = req.files?.videoFile?.[0];
  const thumbnailData = req.files?.thumbnail?.[0];

  if (!videoFileData || !videoFileData.path) {
    throw new ApiError(400, "Video file is required");
  }
  if (!thumbnailData || !thumbnailData.path) {
    throw new ApiError(400, "Thumbnail is required");
  }

  if (!videoFileData.mimetype.startsWith("video/")) {
    throw new ApiError(400, "Invalid video file type");
  }
  if (!thumbnailData.mimetype.startsWith("image/")) {
    throw new ApiError(400, "Invalid thumbnail file type");
  }

  const videoFile = await uploadOnCloudinary(videoFileData.path);
  const thumbnail = await uploadOnCloudinary(thumbnailData.path);

  if (!videoFile?.url) {
    throw new ApiError(500, "Error uploading video file");
  }
  if (!thumbnail?.url) {
    throw new ApiError(500, "Error uploading thumbnail");
  }

  const video = await Video.create({
    videoFile: videoFile.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: videoFile.duration,
    owner: userId,
  });

  return res
    .status(201)
    .json(new ApiResponse(200, video, "Video Published Successfully"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video ID is invalid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Cannot find Video");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video ID is invalid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Cannot find Video");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to edit this video");
  }

  const { title, description } = req.body;
  if (!title || title.trim() === "") {
    throw new ApiError(400, "Title cannot be empty");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description cannot be empty");
  }

  const thumbnailData = req.files?.thumbnail?.[0];
  if (thumbnailData) {
    if (!thumbnailData.mimetype.startsWith("image/")) {
      throw new ApiError(400, "Invalid thumbnail file type");
    }
    const thumbnail = await uploadOnCloudinary(thumbnailData.path);
    if (!thumbnail?.url) {
      throw new ApiError(500, "Error uploading thumbnail");
    }

    video.thumbnail = thumbnail.url;
  }

  video.title = title.trim();
  video.description = description.trim();
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video updated successfully"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video ID is invalid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Cannot find Video");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to delete this video");
  }

  await video.deleteOne();

  await Like.deleteMany({ video: videoId });
  await Comment.deleteMany({ video: videoId });
  return res
    .status(200)
    .json(
      new ApiResponse(200, {}, "Video and related data deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Video ID is invalid");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Cannot find Video");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this video");
  }

  video.isPublished = !video.isPublished;
  const message = video.isPublished
    ? "Video published successfully"
    : "Video unpublished successfully";

  await video.save();
  return res
    .status(200)
    .json(new ApiResponse(200, { isPublished: video.isPublished }, message));
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
