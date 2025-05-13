const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')

// Connect to Database
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});


const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);


app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { __v: 0 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(_id).exec();
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build the date filter
    const dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    // Build the exercise query
    const filter = { userId: _id };
    if (from || to) {
      filter.date = dateFilter;
    }

    const exercises = await Exercise.find(filter)
      .limit(parseInt(limit) || 0)
      .select('description duration date -_id')
      .exec();

    // Format dates
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString(),
    }));

    res.json({
      _id: user._id,
      username: user.username,
      from: new Date(from).toDateString() || undefined,
      to: new Date(to).toDateString() || undefined,
      count: log.length,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  // Simulate saving the user to a database
  const newUser = new User({ username });
  await newUser.save();

  res.status(201).json(newUser);
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  const userId = req.params._id;
  const { description, duration, date } = req.body;

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  // Simulate saving the exercise to a database
  const newExercise = new Exercise({
    userId,
    description,
    duration: Number(duration),
    date: date ? new Date(date) : new Date()
  });
  await newExercise.save();

  res.status(201).json({
    _id: newExercise._id,
    username: (await User.findById(userId)).username,
    description,
    duration: Number(duration),
    date: newExercise.date.toDateString()
  });
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
