import supabase from "../config/supabase.js";
import { sendResponse } from "../utils/sendResponse.js";

export const checkTempBlock = async (req, res, next) => {
  try {
    const { email } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) return sendResponse(res, 404, "Invalid credentials");

    if (!user.is_active) {
      return sendResponse(res, 403, 'Your account has been deactivated. Contact support.');
    }

    if (user.temp_block) {
      const blockExpiry = new Date(new Date(user.block_time).getTime() + 15 * 60 * 1000);

      if (new Date() < blockExpiry) {
        const minutesLeft = Math.ceil((blockExpiry - new Date()) / 60000);
        return sendResponse(res, 429, `Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ temp_block: false, login_attempts: 0, block_time: null })
        .eq('email', email);

      if (updateError) {
        console.error("Failed to unblock user:", updateError);
      }
    }

    next();
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, "Internal server error");
  }
};
