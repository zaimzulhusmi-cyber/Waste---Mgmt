module.exports = (req, res) => {
  const url = process.env.SUPABASE_URL || null, key = process.env.SUPABASE_ANON_KEY || null;
  res.status(200).json({ url, key, found: { SUPABASE_URL: !!url, SUPABASE_ANON_KEY: !!key } });
};
