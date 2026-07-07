import random
import json


# ─────────────────────────────────────────────────────────────────────────────
# Smart AI Evaluation Service
#
# This uses an intelligent rule-based engine that produces realistic, varied
# evaluations based on skill overlap analysis. When a GEMINI_API_KEY is set
# in the environment, it will use Google Gemini for real AI evaluation.
# ─────────────────────────────────────────────────────────────────────────────

import os

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

TECH_CATEGORIES = {
    "frontend": ["react", "vue", "angular", "typescript", "javascript", "html", "css", "next.js", "svelte", "redux"],
    "backend": ["python", "fastapi", "django", "flask", "node.js", "express", "java", "spring", "go", "rust", "ruby", "rails"],
    "data": ["sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "pandas", "numpy"],
    "cloud": ["aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd", "devops"],
    "ml": ["machine learning", "tensorflow", "pytorch", "scikit-learn", "nlp", "deep learning", "llm"],
    "soft": ["leadership", "communication", "agile", "scrum", "teamwork", "problem solving"],
}


def _extract_keywords(text: str) -> set:
    text = text.lower()
    keywords = set()
    for category_words in TECH_CATEGORIES.values():
        for word in category_words:
            if word in text:
                keywords.add(word)
    # Also extract comma-separated skills directly
    for part in text.split(","):
        part = part.strip()
        if part and len(part) < 30:
            keywords.add(part)
    return keywords


def _smart_evaluate(job_description: str, candidate_skills: str, experience_years: int) -> dict:
    """
    Produces a realistic evaluation based on skill matching analysis.
    """
    job_keywords = _extract_keywords(job_description)
    candidate_keywords = _extract_keywords(candidate_skills or "")

    # Calculate overlap
    if job_keywords:
        matched = job_keywords & candidate_keywords
        match_ratio = len(matched) / len(job_keywords)
    else:
        match_ratio = 0.5
        matched = set()

    missing = job_keywords - candidate_keywords if job_keywords else set()

    # Experience scoring (assume job wants 3+ years as baseline)
    exp_score = min(experience_years / 5.0, 1.0) if experience_years else 0.3

    # Combined score
    raw_score = (match_ratio * 0.65) + (exp_score * 0.35)
    # Add a small realistic variance
    variance = random.uniform(-0.05, 0.05)
    final_score = max(45, min(98, int((raw_score + variance) * 100)))

    # Build strengths from matched skills
    strengths = []
    if matched:
        matched_list = list(matched)[:4]
        strengths.append(f"Strong proficiency in {', '.join(matched_list)}")
    if experience_years and experience_years >= 3:
        strengths.append(f"{experience_years} years of relevant experience demonstrates solid seniority")
    if match_ratio > 0.6:
        strengths.append("Skill set closely aligns with the job's core requirements")
    if not strengths:
        strengths.append("Shows potential with transferable skills")

    # Build gaps from missing skills
    gaps = []
    missing_list = list(missing)[:3]
    if missing_list:
        gaps.append(f"Missing or unverified experience with: {', '.join(missing_list)}")
    if experience_years and experience_years < 2:
        gaps.append("Less than 2 years of experience may require closer mentorship")
    if not gaps:
        gaps.append("No significant gaps identified — strong candidate overall")

    # Build summary
    if final_score >= 85:
        qualifier = "Excellent"
        recommendation = "Highly recommended for interview."
    elif final_score >= 70:
        qualifier = "Good"
        recommendation = "Recommended for interview with minor reservations."
    elif final_score >= 55:
        qualifier = "Moderate"
        recommendation = "Consider for interview if pipeline is thin."
    else:
        qualifier = "Weak"
        recommendation = "Significant skill gaps — may not be the best fit."

    summary = (
        f"{qualifier} match ({final_score}% compatibility). "
        f"Candidate has {experience_years or 0} years of experience. "
        f"{recommendation}"
    )

    # Detailed fit breakdown
    skills_score = int(match_ratio * 100)
    exp_score_pct = int(exp_score * 100)
    edu_score = 85 if "degree" in job_description.lower() or "bachelor" in job_description.lower() else 70

    fit_breakdown = {
        "skills_score": skills_score,
        "experience_score": exp_score_pct,
        "education_score": edu_score,
        "reasoning": f"Candidate aligns {skills_score}% on technical keywords, shows a {exp_score_pct}% experience fit with {experience_years or 0} years experience, and matches education requirements at {edu_score}%."
    }

    return {
        "score": final_score,
        "summary": summary,
        "strengths": strengths,
        "gaps": gaps,
        "fit_breakdown": fit_breakdown
    }


async def _gemini_evaluate(job_description: str, candidate_skills: str, experience_years: int) -> dict:
    """Calls Google Gemini for real AI evaluation."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-1.5-flash")

        prompt = f"""You are an expert technical recruiter AI. Evaluate this candidate for the job.

Job Description:
{job_description}

Candidate Profile:
- Skills: {candidate_skills or 'Not specified'}
- Years of Experience: {experience_years or 0}

Respond ONLY with a valid JSON object in this exact format:
{{
  "score": <integer 0-100>,
  "summary": "<one sentence summary>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "fit_breakdown": {{
    "skills_score": <integer 0-100>,
    "experience_score": <integer 0-100>,
    "education_score": <integer 0-100>,
    "reasoning": "<short reasoning details>"
  }}
}}"""

        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean up markdown code blocks if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text)
    except Exception as e:
        print(f"Gemini API error, falling back to smart mock: {e}")
        return _smart_evaluate(job_description, candidate_skills, experience_years)


async def evaluate_candidate(
    job_description: str,
    candidate_skills: str,
    experience_years: int
) -> dict:
    """
    Main entry point. Uses Gemini if API key is set, otherwise smart mock.
    Returns: { score, summary, strengths: [], gaps: [], fit_breakdown: {} }
    """
    if GEMINI_API_KEY:
        return await _gemini_evaluate(job_description, candidate_skills, experience_years)
    else:
        return _smart_evaluate(job_description, candidate_skills, experience_years)


async def recruiter_chat(query: str, db_context: dict) -> str:
    """Conversational technical assistant interface using Gemini or mock database query matching."""
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            prompt = f"""You are 'TalentAI Assistant', an expert recruiter AI. Use this database context to answer the recruiter's query.

Database Context:
{json.dumps(db_context, indent=2)}

User query:
{query}

Provide a helpful, professional recruiter response. You can list candidates, summarize their profiles, match jobs, or suggest next steps. Use markdown tables and lists where appropriate."""
            
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini chat error, falling back to mock query: {e}")
            
    # Mock fallback matching logic
    query_lower = query.lower()
    candidates = db_context.get("candidates", [])
    jobs = db_context.get("jobs", [])
    
    if "candidate" in query_lower or "people" in query_lower or "developer" in query_lower or "engineer" in query_lower or "profile" in query_lower:
        # Search candidate skills
        matched = []
        for c in candidates:
            skills = (c.get("parsed_skills") or "").lower()
            headline = (c.get("headline") or "").lower()
            name = (c.get("user") or {}).get("first_name", "") + " " + (c.get("user") or {}).get("last_name", "")
            email = (c.get("user") or {}).get("email", "")
            
            # Simple keyword matching
            match = False
            for word in query_lower.split():
                if len(word) > 2 and (word in skills or word in headline or word in name.lower()):
                    match = True
            
            if match or not any(len(w) > 2 for w in query_lower.split()):
                matched.append(c)
                
        if matched:
            result = "### Matched Candidates\nHere are the candidates matching your query:\n\n"
            result += "| Name | Title | Experience | Skills |\n"
            result += "| --- | --- | --- | --- |\n"
            for c in matched:
                name = f"{c.get('user', {}).get('first_name', '')} {c.get('user', {}).get('last_name', '')}".strip() or c.get('user', {}).get('email', '')
                headline = c.get("headline") or "Software Developer"
                exp = f"{c.get('experience_years', 0)} yrs"
                skills = ", ".join((c.get("parsed_skills") or "").split(",")[:4])
                result += f"| {name} | {headline} | {exp} | {skills} |\n"
            return result
        else:
            return "I couldn't find any candidate profiles matching those keywords in the talent pool."
            
    elif "job" in query_lower or "position" in query_lower or "role" in query_lower:
        result = "### Active Job Openings\n"
        result += "| Title | Department | Location | Salary |\n"
        result += "| --- | --- | --- | --- |\n"
        for j in jobs:
            result += f"| {j.get('title')} | {j.get('department') or 'N/A'} | {j.get('location') or 'Remote'} | {j.get('salary_range') or 'N/A'} |\n"
        return result
        
    return f"Hello! I am your TalentAI Assistant. I can help search candidate profiles or view job openings. Try queries like 'show candidates with React skills' or 'list active jobs'."


async def parse_resume_text(resume_text: str) -> dict:
    """
    Extracts structured info from resume text.
    Returns: { skills: str, experience_years: int, education: str, headline: str }
    """
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""Extract structured information from this resume text.

Resume:
{resume_text[:3000]}

Respond ONLY with valid JSON:
{{
  "skills": "<comma-separated list of technical skills>",
  "experience_years": <integer>,
  "education": "<highest degree and field>",
  "headline": "<professional title in 5 words or less>"
}}"""
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except Exception as e:
            print(f"Gemini resume parse error: {e}")

    # Smart mock extraction
    keywords = _extract_keywords(resume_text)
    skills = ", ".join(list(keywords)[:12]) if keywords else "General skills"
    
    # Rough experience estimate from years mentioned in text
    import re
    years_mentioned = re.findall(r'(\d+)\s*(?:years?|yrs?)', resume_text.lower())
    exp = max([int(y) for y in years_mentioned], default=0) if years_mentioned else 2

    return {
        "skills": skills,
        "experience_years": min(exp, 25),
        "education": "Bachelor's degree (extracted)",
        "headline": "Software Professional",
    }


async def generate_job_description(title: str, department: str, skills: str) -> str:
    """Generates a professional job description."""
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""You are an expert technical recruiter. Write a professional, compelling, and well-structured job description for the following role:
Title: {title}
Department: {department}
Required Skills: {skills}

Format the output in clean Markdown with clear headings like "About the Role", "Key Responsibilities", and "Requirements"."""
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            print(f"Gemini JD generate error: {e}")

    # Fallback to smart template
    return f"""### About the Role
We are looking for an experienced **{title}** to join our fast-growing **{department or 'Engineering'}** team. In this role, you will be responsible for designing and developing scalable software solutions that drive our core business.

### Key Responsibilities
- Architect, build, and maintain efficient, reusable, and reliable code.
- Collaborate with cross-functional teams to define, design, and ship new features.
- Ensure the best possible performance, quality, and responsiveness of applications.
- Identify bottlenecks and bugs, and devise solutions to these problems.

### Requirements
- Proven experience working as a {title}.
- Strong proficiency in the following skills: **{skills}**.
- Solid understanding of software development principles and best practices.
- Excellent problem-solving skills and a strong work ethic.
- Ability to work both independently and collaboratively in a team environment.
"""

async def generate_interview_questions(job_title: str, job_desc: str, candidate_skills: str) -> list[str]:
    """Generates a list of targeted interview questions for a candidate."""
    if GEMINI_API_KEY:
        try:
            import google.generativeai as genai
            genai.configure(api_key=GEMINI_API_KEY)
            model = genai.GenerativeModel("gemini-1.5-flash")
            prompt = f"""You are an expert technical interviewer. Generate exactly 5 targeted, highly-specific interview questions for a candidate applying for the role of "{job_title}".
            
Job Description Snippet:
{job_desc[:1000]}

Candidate's Stated Skills:
{candidate_skills}

Respond ONLY with a valid JSON array of 5 strings. Example: ["question 1", "question 2", "question 3", "question 4", "question 5"]. Do not include markdown formatting or other text."""
            response = model.generate_content(prompt)
            text = response.text.strip()
            if text.startswith("```"):
                text = text.split("```")[1]
                if text.startswith("json"):
                    text = text[4:]
            return json.loads(text)
        except Exception as e:
            print(f"Gemini interview generate error: {e}")

    # Fallback to smart mock questions based on skills
    skills_list = [s.strip() for s in candidate_skills.split(",")] if candidate_skills else []
    
    questions = [
        f"Can you describe your previous experience working as a {job_title or 'professional'}?",
        "Describe a time when you had to overcome a difficult technical challenge."
    ]
    
    if skills_list:
        questions.append(f"How would you rate your proficiency in {skills_list[0]}, and can you give an example of a complex problem you solved using it?")
    if len(skills_list) > 1:
        questions.append(f"When would you choose {skills_list[1]} over an alternative technology?")
        
    questions.append("How do you ensure code quality and maintainability in your projects?")
    
    # Ensure exactly 5
    while len(questions) < 5:
        questions.append("What are your primary strategies for continuous learning and keeping your skills up to date?")
        
    return questions[:5]
