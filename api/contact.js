export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, company, agentFit, type } = req.body;

  // Validate required fields
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Different validation based on type
  if (type !== 'workflow-audit' && !company) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Send email using Resend
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      // If no API key, just log and return success (for testing)
      console.log('Contact form submission:', { name, email, phone, company, agentFit });
      return res.status(200).json({ success: true, message: 'Thanks! We\'ll be in touch soon.' });
    }

    // Prepare email content based on type
    let subject, htmlContent;

    if (type === 'workflow-audit') {
      subject = `Workflow Audit Request: ${name}`;
      htmlContent = `
        <h2>Workflow Audit Request</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">This person requested a free workflow audit. Reply directly to this email to schedule.</p>
      `;
    } else {
      subject = `New Quiz Submission: ${name} - ${company}`;
      htmlContent = `
        <h2>New Quiz Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Agent Fit:</strong> ${agentFit}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">Reply directly to this email to respond to ${name}</p>
      `;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: 'hello@eligeo.com',
        replyTo: email,
        subject: subject,
        html: htmlContent
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return res.status(200).json({
      success: true,
      message: 'Thanks! We\'ll be in touch soon.'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to send message. Please try again.'
    });
  }
}
