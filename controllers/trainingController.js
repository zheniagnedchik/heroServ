const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Trainings");
const storeUsers = new DocumentStore("http://64.226.88.96:8080", "Users");
store.initialize();
storeUsers.initialize();
const fs = require("fs");
const path = require("path");
const Post = require("../models/post");
const URI = "http://64.226.88.96";
const FormData = require("form-data");
const axios = require("axios");
const Trainings = require("../models/training");

exports.createTraining = async (req, res) => {
  try {
    const { creator, exercise, days, nameTraining, type } = req.body;
    const session = store.openSession();
    const newTraining = new Trainings(
      creator,
      exercise,
      days,
      nameTraining,
      type
    );
    await session.store(newTraining);
    await session.saveChanges();
    res.status(201).json(newTraining);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Произошла ошибка при добавлении тренировки" });
  }
};

exports.editTrainings = async (req, res) => {
  const session = store.openSession();
  try {
    const { creator, exercise, days, nameTraining, type, id } = req.body;
    const training = await session.load(id);
    if (training) {
      training.creator = creator;
      training.exercise = exercise;
      training.days = days;
      training.nameTraining = nameTraining;
      training.type = type;
      await session.saveChanges();
      res.status(200).json(training);
    } else {
      console.log("Объект не найден");
    }
  } catch (err) {
    console.log(err);
  }
};
exports.trainingsDel = async (req, res) => {
  const session = store.openSession();
  try {
    const { id } = req.body;
    const training = await session.load(id);
    if (training) {
      session.delete(training);
      await session.saveChanges();
      res.status(200).json(training);
    } else {
      console.log("Объект не найден");
    }
  } catch (err) {
    console.log(err);
  }
};
exports.getTrainingsFromUserId = async (req, res) => {
  const session = store.openSession();

  try {
    const { creator } = req.body;

    const trainings = await session
      .query({ collection: "Trainings" })
      .whereEquals("creator", creator)
      .whereEquals("type", "train")
      .all();

    res.status(200).json(trainings);
  } catch (err) {
    console.error("Ошибка при получении тренировок:", err);
    res.status(500).send("Ошибка на сервере.");
  }
};
exports.getFoodFromUserId = async (req, res) => {
  const session = store.openSession();

  try {
    const { creator } = req.body;

    const trainings = await session
      .query({ collection: "Trainings" })
      .whereEquals("creator", creator)
      .whereEquals("type", "food")
      .all();

    res.status(200).json(trainings);
  } catch (err) {
    console.error("Ошибка при получении тренировок:", err);
    res.status(500).send("Ошибка на сервере.");
  }
};
