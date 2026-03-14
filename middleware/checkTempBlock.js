import db from "../config/db.js";
import { sendResponse } from "../utils/sendResponse.js";

export const checkTempBlock = async (req, res, next) => {
  console.log("Entered to check temp block account")
  try {
    const { email } = req.body;
    const sql = "select * from users where email = ? limit 1";

    const [result] = await db.execute(sql, [email]);
    if (result.length === 0) return sendResponse(res, 404, "Invalid credentials")
    console.log('result', result)

    const user = result[0]
    console.log('user', user)

    if (user.is_active === 0) {
      return sendResponse(res, 403, 'Your account has been deactivated. Contact support.');
    }

    if (user.temp_block === 1) {
      const blockExpiry = new Date(user.block_time.getTime() + 15 * 60 * 1000);

      if (new Date() < blockExpiry) {
        const minutesLeft = Math.ceil((blockExpiry - new Date()) / 60000);
        return sendResponse(res, 429, `Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
      }

      const [rows] = await db.execute('UPDATE users SET temp_block = 0, login_attempts = 0, block_time = NULL WHERE email = ?', [email]);
      console.log(rows);
      if (rows.affectedRows === 0) {
        console.error("nothing update one extra step ");
      }
    }
    console.log("exit from check temp block")
    next()
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, "Internal server error");
  }
}
