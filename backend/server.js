import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mysql from 'mysql2/promise';
import { getItemsData, insertItemData, getBarangMasukData, getBarangKeluarData, updateItemData, deleteItemData, getLaporanMasukData, getLaporanKeluarData, getLaporanData, insertBarangMasuk, insertBarangKeluar } from './config/koneksi.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
const app = express();
const port = process.env.PORT;
const router = express.Router();

app.use(cors());
app.use(bodyParser.json());

router.get('/api/types', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT type, SUM(current_quantity) AS currentStock
      FROM products
      GROUP BY type
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching types:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.use(router);

app.get('/items', async (req, res) => {
  try {
    const items = await getItemsData();
    res.json(items);
  } catch (error) {
    console.error('Gagal mengambil data:', error);
    res.status(500).json({ message: 'Gagal mengambil data' });
  }
});

app.post('/items', async (req, res) => {
  try {
    const newItem = req.body;
    await insertItemData(newItem);
    res.status(201).json({ message: 'Item berhasil ditambahkan' });
  } catch (error) {
    console.error('Gagal menambahkan item:', error);
    res.status(500).json({ message: 'Gagal menambahkan item' });
  }
});
app.get('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).send('Item not found');
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching item data:', error);
    res.status(500).send('Error fetching item data');
  }
});
app.put('/items/:id_produk', async (req, res) => {
  try {
    const id_produk = req.params.id_produk;
    const updatedItem = req.body;
    await updateItemData(id_produk, updatedItem);
    res.status(200).json({ message: 'Item berhasil diperbarui' });
  } catch (error) {
    console.error('Gagal memperbarui item:', error);
    res.status(500).json({ message: 'Gagal memperbarui item' });
  }
});
app.delete('/items/:id_produk', async (req, res) => {
  const { id_produk } = req.params;
  try {
    const data = await deleteItemData(id_produk);
    const result = data.affectedRows;
    if (result.affectedRows > 0) {
      res.status(200).send('Item deleted successfully');
    } else {
      res.status(404).send('Item not found');
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/api/barang-masuk', async (req, res) => {
  try {
    const data = await getBarangMasukData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching detailed transaction data:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/products', async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT id, category, type, batch_number, manufacture_brand FROM products');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).send('Error fetching products');
  } finally {
    connection.release();
  }
});
app.post('/insertBarangMasuk', async (req, res) => {
  try {
    const result = await insertBarangMasuk(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to insert barang masuk:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error inserting barang masuk', error: error.message });
  }
});
app.post('/insertBarangKeluar', async (req, res) => {
  try {
    const result = await insertBarangKeluar(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Failed to insert barang Keluar:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Error inserting barang Keluar', error: error.message });
  }
});

app.get('/api/barang-keluar', async (req, res) => {
  try {
    const data = await getBarangKeluarData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching barang keluar data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/laporan-masuk', async (req, res) => {
  try {
    const data = await getLaporanMasukData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching laporan masuk data:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/api/laporan-keluar', async (req, res) => {
  try {
    const data = await getLaporanKeluarData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching laporan keluar data:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/laporan-data', async (req, res) => {
  try {
    const data = await getLaporanData();
    res.json(data);
  } catch (error) {
    console.error('Error fetching laporan data:', error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/barangMasuk', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT SUM(amount) as totalAmount FROM transactions WHERE transaction_type = "in"');
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching data for barang masuk:', error);
    res.status(500).send('Error fetching data for barang masuk');
  }
});

// Endpoint untuk mengambil jumlah total 'amount' dari transaksi barang keluar
app.get('/barangKeluar', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT SUM(amount) as totalAmount FROM transactions WHERE transaction_type = "out"');
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching data for barang keluar:', error);
    res.status(500).send('Error fetching data for barang keluar');
  }
});

// Endpoint untuk mengambil jumlah jenis barang dari data produk
app.get('/jenisBarang', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) as totalJenis FROM products');
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching data for jenis barang:', error);
    res.status(500).send('Error fetching data for jenis barang');
  }
});

// Endpoint untuk mengambil jumlah total stok barang dari produk
app.get('/stokBarang', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT SUM(current_quantity) as totalStok FROM products');
    res.json(rows[0]); 
  } catch (error) {
    console.error('Error fetching data for stok barang:', error);
    res.status(500).send('Error fetching data for stok barang');
  }
});

app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
