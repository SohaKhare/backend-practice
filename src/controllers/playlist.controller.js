import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user?._id;

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Name field cannot be empty");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description field cannot be empty");
  }

  const playlist = await Playlist.create({
    name,
    description,
    videos: [],
    owner: userId,
  });

  if (!playlist) {
    throw new ApiError(500, "Error in creating playlist");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid User ID");
  }

  const playlists = await Playlist.find({ owner: userId }).sort({
    createdAt: -1,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, playlists, "Playlists fetched successfully"));
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }

  const playlist = await Playlist.findById(playlistId).populate({
    path: "videos",
    select: "title thumbnail duration",
  });

  if (!playlist) {
    throw new ApiError(404, "Cannot find playlist");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }

  if (playlist.videos.includes(videoId)) {
    throw new ApiError(409, "Video already exists in the playlist");
  }

  playlist.videos.push(videoId);
  await playlist.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID");
  }

  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to modify this playlist");
  }
  if (!playlist.videos.includes(videoId)) {
    throw new ApiError(409, "Video does not exist in the playlist");
  }

  playlist.videos.pull(videoId);
  await playlist.save();
  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Video removed from playlist successfully")
    );
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this playlist");
  }

  await playlist.deleteOne();
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid Playlist ID");
  }
  const playlist = await Playlist.findById(playlistId);
  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }
  if (playlist.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to update this playlist");
  }

  if (!name || name.trim() === "") {
    throw new ApiError(400, "Name field cannot be empty");
  }
  if (!description || description.trim() === "") {
    throw new ApiError(400, "Description field cannot be empty");
  }

  playlist.name = name.trim();
  playlist.description = description.trim();
  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getPlaylistById,
  getUserPlaylists,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
