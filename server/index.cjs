const express = require("express");
const { Pool } = require("pg");

const app = express();
const PORT = 3001;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(express.json());

/* -----------------------------
   Health check
----------------------------- */

app.get("/api/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");

    res.json({
      ok: true,
      database: "connected",
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      ok: false,
      database: "disconnected",
      error: "Database connection failed",
    });
  }
});

/* -----------------------------
   MPLADS summary
----------------------------- */

app.get("/api/mplads/summary", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        mp_name,
        house,
        tenure,
        state,
        constituency,
        constituency_id,
        allocated_limit,
        expenditure_completed_ongoing,
        works_recommended_count,
        works_recommended_amount,
        works_sanctioned_count,
        works_sanctioned_amount,
        works_completed_count,
        works_completed_amount,
        calamity_count,
        calamity_amount
      FROM mplads_mp_metrics
      ORDER BY mp_name
    `);

    res.json({
      source: "MPLADS",
      source_url: "https://www.mplads.gov.in/",
      count: result.rows.length,
      records: result.rows,
    });
  } catch (error) {
    console.error("MPLADS summary error:", error);

    res.status(500).json({
      error: "Failed to load MPLADS summary",
    });
  }
});

/* -----------------------------
   MPLADS works
----------------------------- */

app.get("/api/mplads/works", async (req, res) => {
  try {
    const {
      mp,
      status,
      constituency,
      limit = 100,
    } = req.query;

    const conditions = [];
    const values = [];

    if (mp) {
      values.push(`%${mp}%`);
      conditions.push(`mp_name ILIKE $${values.length}`);
    }

    if (status) {
      values.push(status);
      conditions.push(`work_status = $${values.length}`);
    }

    if (constituency) {
      values.push(`%${constituency}%`);
      conditions.push(`constituency ILIKE $${values.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const parsedLimit = Math.min(
      Math.max(Number(limit) || 100, 1),
      500
    );

    values.push(parsedLimit);

    const result = await pool.query(
      `
      SELECT
        source_record_id,
        work_id,
        mp_name,
        house,
        tenure,
        state,
        constituency,
        constituency_id,
        district_authority,
        work_category,
        activity_name,
        work_description,
        work_stage,
        work_status,
        recommendation_date,
        sanction_date,
        actual_end_date,
        recommended_amount,
        sanction_amount,
        actual_amount,
        letter_no,
        work_recommendation_detail_id,
        attach_id,
        file_status,
        average_rating
      FROM mplads_works
      ${whereClause}
      ORDER BY recommendation_date DESC NULLS LAST
      LIMIT $${values.length}
      `,
      values
    );

    res.json({
      source: "MPLADS",
      source_url: "https://www.mplads.gov.in/",
      count: result.rows.length,
      filters: {
        mp: mp || null,
        status: status || null,
        constituency: constituency || null,
      },
      works: result.rows,
    });
  } catch (error) {
    console.error("MPLADS works error:", error);

    res.status(500).json({
      error: "Failed to load MPLADS works",
    });
  }
});

/* -----------------------------
   MPLADS combined endpoint
----------------------------- */

app.get("/api/mplads", async (req, res) => {
  try {
    const { mp, constituency } = req.query;

    const values = [];
    const conditions = [];

    if (mp) {
      values.push(`%${mp}%`);
      conditions.push(`mp_name ILIKE $${values.length}`);
    }

    if (constituency) {
      values.push(`%${constituency}%`);
      conditions.push(`constituency ILIKE $${values.length}`);
    }

    const whereClause =
      conditions.length > 0
        ? `WHERE ${conditions.join(" AND ")}`
        : "";

    const metricsResult = await pool.query(
      `
      SELECT
        mp_name,
        house,
        tenure,
        state,
        constituency,
        constituency_id,
        allocated_limit,
        expenditure_completed_ongoing,
        works_recommended_count,
        works_recommended_amount,
        works_sanctioned_count,
        works_sanctioned_amount,
        works_completed_count,
        works_completed_amount,
        calamity_count,
        calamity_amount
      FROM mplads_mp_metrics
      ${whereClause}
      ORDER BY mp_name
      `,
      values
    );

    const worksResult = await pool.query(
      `
      SELECT
        source_record_id,
        work_id,
        mp_name,
        house,
        tenure,
        state,
        constituency,
        constituency_id,
        district_authority,
        work_category,
        activity_name,
        work_description,
        work_stage,
        work_status,
        recommendation_date,
        sanction_date,
        actual_end_date,
        recommended_amount,
        sanction_amount,
        actual_amount,
        letter_no,
        work_recommendation_detail_id,
        attach_id,
        file_status,
        average_rating
      FROM mplads_works
      ${whereClause}
      ORDER BY recommendation_date DESC NULLS LAST
      LIMIT 500
      `,
      values
    );

    res.json({
      source: "MPLADS",
      source_url: "https://www.mplads.gov.in/",
      mp: metricsResult.rows,
      works: worksResult.rows,
    });
  } catch (error) {
    console.error("MPLADS API error:", error);

    res.status(500).json({
      error: "Failed to load MPLADS data",
    });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS mp_count,
        COALESCE(SUM(works_recommended_count), 0)::int AS recommended_count,
        COALESCE(SUM(works_sanctioned_count), 0)::int AS sanctioned_count,
        COALESCE(SUM(works_completed_count), 0)::int AS completed_count,
        COALESCE(SUM(works_recommended_amount), 0)::numeric AS recommended_amount,
        COALESCE(SUM(works_sanctioned_amount), 0)::numeric AS sanctioned_amount,
        COALESCE(SUM(works_completed_amount), 0)::numeric AS completed_amount,
        COALESCE(SUM(expenditure_completed_ongoing), 0)::numeric AS expenditure_completed_ongoing
      FROM mplads_mp_metrics
    `);

    const row = result.rows[0];

    res.json({
      source: "MPLADS",
      source_url: "https://www.mplads.gov.in/",
      available: true,
      last_synced_at: new Date().toISOString(),

      metrics: {
        mp_count: row.mp_count,
        recommended: row.recommended_count,
        sanctioned: row.sanctioned_count,
        completed: row.completed_count,
        recommended_amount: Number(row.recommended_amount),
        sanctioned_amount: Number(row.sanctioned_amount),
        completed_amount: Number(row.completed_amount),
        expenditure_completed_ongoing: Number(
          row.expenditure_completed_ongoing
        ),
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    res.status(500).json({
      available: false,
      error: "Failed to load dashboard data",
    });
  }
});

/* -----------------------------
   Start server
----------------------------- */

app.listen(PORT, () => {
  console.log(
    `JanPratinidhi API running at http://localhost:${PORT}`
  );
});