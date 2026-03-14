export const signupVerifyTemplate = (otp) => {
    return `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 400px; margin: 0 auto; padding: 30px 20px; text-align: center; border: 1px solid #f5f5f4; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <div style="margin-bottom: 20px;">
                <div style="background-color: #f0fdf4; width: 60px; height: 60px; line-height: 60px; border-radius: 50%; margin: 0 auto; display: inline-block;">
                    <span style="font-size: 30px;">✉️</span>
                </div>
            </div>
            <h2 style="color: #1c1917; margin: 0 0 10px 0; font-size: 22px;">Verify Your Email</h2>
            <p style="color: #78716c; font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                Welcome! Use the code below to verify your email address and complete your registration:
            </p>
            <div style="background-color: #fafaf9; border: 2px dashed #e7e5e4; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #d97706; font-family: monospace;">${otp}</span>
            </div>
            <p style="color: #a8a29e; font-size: 12px; margin-bottom: 0;">
                Valid for <b>10 minutes</b>. <br>
                If you didn't create an account, you can safely ignore this email.
            </p>
        </div>
    `;
};