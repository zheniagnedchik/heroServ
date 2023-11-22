const { DocumentStore } = require("ravendb");
const bcrypt = require("bcrypt");
const jwt = require("node-jsonwebtoken");
const User = require("../models/user");
const ffmpeg = require("fluent-ffmpeg");
const multer = require("multer");
const store = new DocumentStore("http://64.226.88.96:8080", "Shop");

store.initialize();
const Shop = require("../models/shop");

exports.addItemToShop = async (req, res) => {
  console.log(res);
  try {
    const session = store.openSession();
    const { id_num, img, name, retailPrice, price, category } = req.body;
    const newPost = new Shop(id_num, img, name, retailPrice, price, category);

    await session.store(newPost);
    await session.saveChanges();
    res.send("ok");
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};
exports.getAllItemsFromShop = async (req, res) => {
  try {
    const session = store.openSession();

    // Используйте метод 'query' для получения всех элементов
    const items = await session
      .query({ collection: "Shops" }) // Убедитесь, что 'Shops' соответствует вашей коллекции
      .all();

    res.send({ success: true, data: items });
  } catch (error) {
    res.send({ success: false, message: error.message });
  }
};
exports.searchShop = async (req, res) => {
  const searchTerm = req.body.searchTerm;
  const session = store.openSession();
  try {
    // Полнотекстовый поиск без использования индекса
    const results = await session
      .query({ indexName: "Shops_ByNameAndCategory" })
      .search("Name", searchTerm)
      .orElse()
      .search("Category", searchTerm)
      .all();
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
