# CyberSense AI — Think Like a Defender

**An interactive cybersecurity learning platform that helps users develop defensive security skills through practical missions, assessments, and personalized challenge recommendations.**

## 1. Overview

CyberSense AI is a cybersecurity education platform designed to help learners strengthen their ability to recognize threats, respond to security incidents, and understand secure coding practices.

The platform combines interactive cybersecurity missions, pre-training and post-training assessments, progress tracking, and performance-based challenge recommendations to support a more personalized learning experience.

## 2. Problem Statement

Traditional cybersecurity education can rely heavily on theoretical content and generic exercises. Beginners may find it difficult to apply security concepts to practical scenarios, identify their weaknesses, and determine which skills require further practice.

CyberSense AI addresses this problem by providing an interactive learning environment where users can practice defensive cybersecurity skills and track their progress.

## 3. Proposed Solution

CyberSense AI provides a structured learning experience through cybersecurity missions, skill assessments, and personalized challenge recommendations.

Users can assess their initial knowledge, complete practical missions, review their performance, and take a post-training assessment to compare their results. The recommendation system prioritizes challenges based on available performance data and identifies areas that may need additional practice.

## 4. Key Features

- **User Authentication:** Account registration and sign-in.
- **Personalized Dashboard:** An overview of learning activities and recommended challenges.
- **Phishing Investigator:** A mission focused on phishing awareness and threat identification.
- **Incident Response:** A mission focused on defensive incident-handling concepts.
- **Secure Code Detective:** A mission focused on recognizing secure coding issues.
- **Pre-Training Assessment:** Evaluates users' initial knowledge using six questions.
- **Post-Training Assessment:** Uses six questions to help users compare their learning outcomes after completing a mission.
- **Progress Tracking:** Stores user progress and assessment results.
- **Challenge Recommendations:** Prioritizes challenges based on assessment scores, mission accuracy, and recent mistakes.
- **Difficulty Adaptation:** Uses consecutive correct and incorrect answers to adjust challenge difficulty.
- **Admin Functionality:** Provides an administrative interface with access controls.

Feature availability and completion should be verified against the current deployed version.

## 5. Technology Stack

The project is developed using Lovable and its application development workflow.

The expected technologies include:

- **Frontend:** React and TypeScript
- **Styling:** Tailwind CSS and the project's existing UI components
- **Backend and persistence:** Lovable Cloud
- **Authentication:** The authentication service configured for the project
- **Database:** The database connected to the current Lovable Cloud project
- **Version Control:** Git and GitHub

Verify the actual dependencies and backend configuration in `package.json` and the project settings before treating this list as final.

## 6. AI Methodology and Implementation

The current personalization approach is rule-based rather than a confirmed trained machine-learning model.

### Performance-Based Recommendations

The recommendation logic considers available user performance information, including:

- Assessment scores
- Mission accuracy
- Recent mistakes
- Challenge difficulty

These signals are used to prioritize challenges and suggest an appropriate difficulty level.

### Adaptive Difficulty

The current rule-based difficulty logic uses consecutive answers:

- Three consecutive correct answers can increase the challenge difficulty.
- Two consecutive incorrect answers can reduce the difficulty.
- Otherwise, the standard difficulty is maintained.

### Learning Progress Evaluation

Pre-training and post-training assessments help learners compare their performance across skills and identify potential areas for improvement.

**AI limitation:** These features should not be represented as a trained AI model or an integrated large language model unless such a model is implemented and verified. Lovable is used as an AI-assisted development tool; that does not by itself mean the finished product calls an AI model.

## 7. AI Models and APIs Used

The current implementation information available for this project does not confirm an integrated external AI model or AI API.

The personalization and difficulty-adjustment logic is described as rule-based.

- **AI-assisted development:** Lovable.
- **In-product recommendation logic:** Rule-based personalization.
- **External AI model/API:** Not confirmed in the current implementation.

If an external model or API is integrated, document its exact name, provider, purpose, and usage here. Never include API keys, access tokens, or other secrets in this README.

## 8. Installation and Setup

### Prerequisites

- Node.js
- npm
- Git
- Access to the project's configured backend and environment variables

### Run Locally

Clone the repository:

```bash
git clone https://github.com/nimra23-cyber/Cyber_Sense.git
cd https://github.com/nimra23-cyber/Cyber_Sense.git
```

Install dependencies:

```bash
npm install
```

Configure the environment variables required by the project. Use the variable names documented in `.env.example`, if provided. Obtain any required values through the appropriate project settings. Do not commit real secrets.

Start the development server:

```bash
npm run dev
```

Open the local URL displayed in the terminal.

### Additional Commands

Run the available project scripts as defined in `package.json`. For example, if configured:

```bash
npm run build
npm run test
```

The available scripts may differ depending on the project configuration.

## 9. Database and Security

CyberSense AI uses the backend and database configured for the current project.

Security considerations include:

- Authentication for protected pages.
- Access controls for administrative functionality.
- Database permissions that restrict users to their own records.
- Keeping private API keys and service-role credentials out of frontend code and public repositories.
- Avoiding destructive changes to existing database tables and user data.

Database policies and access controls must be verified before production deployment.

## 10. Product Screenshots

Add screenshots of the actual application to this repository or provide an accessible link to a shared folder.

Recommended screenshots:

1. Home page
2. Sign-in and registration pages
3. User dashboard
4. Phishing Investigator mission
5. Incident Response mission
6. Secure Code Detective mission
7. Pre-training and post-training assessments
8. Challenge recommendations
9. Assessment progress comparison
10. Admin interface

**Screenshots folder:** `docs/screenshots/`

Replace this section with the actual screenshot files or repository paths once they have been added.

## 11. Team Member Contributions

**Team:** Solo project

The project lead is responsible for developing the CyberSense AI concept, designing the learning experience, implementing and refining the application using AI-assisted development tools, organizing cybersecurity missions and assessments, and developing the performance-based recommendation logic.

Testing, documentation, and further improvements are part of the ongoing development process.

## 12. Current Development Status

CyberSense AI is a working prototype under development.

Automated tests have been reported as passing, but key user journeys—including account registration, email verification, admin access, assessments, and changes in recommendations—require manual verification in the current environment.

The application should not be considered production-ready until its authentication, authorization, database permissions, accessibility, responsiveness, and user flows have been thoroughly tested.

## 13. Future Improvements

Potential future improvements include:

- Expanding the cybersecurity question bank.
- Adding more practical missions and realistic scenarios.
- Improving recommendation quality through further evaluation.
- Introducing a verified AI model integration if it provides meaningful educational value.
- Improving accessibility and mobile responsiveness.
- Adding more detailed learning analytics and progress reports.

These are future opportunities, not claims that the features are already implemented.

## 14. Project Links

- **Live Application:** (https://cyber-sensei-mission-lab.lovable.app))
- **GitHub Repository:** (https://github.com/nimra23-cyber/Cyber_Sense.git)
- **Screenshots:** https://drive.google.com/drive/folders/1oElIT89uZ6vUNSz6ZOOL6p-lbUboALNr?usp=sharing
- **Additional Documentation:** <YOUR_DOCUMENTATION_URL>
