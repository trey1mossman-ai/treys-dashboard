/**
 * Task Completion Email API Endpoint
 * Handles automated email updates when tasks are completed
 */

export async function onRequestPost(context: EventContext<Env>) {
  const { request } = context;

  try {
    const body = await request.json();
    const {
      action,
      task,
      project,
      recipients,
      tone = 'professional_update',
      customMessage = '',
      includeNextSteps = true,
      includeProjectStatus = true,
      sendCopy = true
    } = body;

    if (action !== 'send_task_completion') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid action'
      }), { status: 400 });
    }

    if (!task || !project || !recipients || recipients.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), { status: 400 });
    }

    // Prepare email data for AI processing
    const emailPrompt = {
      action: 'compose_task_completion_email',
      context: {
        task: {
          title: task.title,
          description: task.description,
          completedAt: task.completedAt,
          estimatedHours: task.estimatedHours,
          actualHours: task.actualHours
        },
        project: {
          name: project.name,
          deadline: project.deadline,
          progress: project.progress,
          status: project.status
        },
        preferences: {
          tone,
          includeNextSteps,
          includeProjectStatus,
          customMessage
        }
      },
      recipients,
      instructions: `Generate a ${tone} email update about task completion.
        ${includeProjectStatus ? 'Include project status summary.' : ''}
        ${includeNextSteps ? 'Suggest next steps or priorities.' : ''}
        ${customMessage ? `Additional context: ${customMessage}` : ''}
        Keep it concise and actionable.`
    };

    // Send to n8n webhook for AI processing and email delivery
    const n8nWebhookUrl = 'https://flow.voxemarketing.com/webhook/task-completion';

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Source': 'dashboard-task-completion'
      },
      body: JSON.stringify(emailPrompt)
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const result = await response.json();

    // Log the completion event
    console.log('📧 Task completion email processed:', {
      taskTitle: task.title,
      projectName: project.name,
      recipientCount: recipients.length,
      tone,
      timestamp: new Date().toISOString()
    });

    // Return success response
    return new Response(JSON.stringify({
      success: true,
      message: 'Task completion update sent successfully',
      data: {
        taskId: task.id,
        projectId: project.id,
        recipientCount: recipients.length,
        emailId: result.emailId || null,
        processedAt: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });

  } catch (error) {
    console.error('Error processing task completion email:', error);

    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to process task completion email',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle preflight OPTIONS requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}