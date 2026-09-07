from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from src.core.config import settings

# Why use OpenRouter via ChatOpenAI?
# OpenRouter exposes the exact same API format as OpenAI. 
# By changing the base_url, we can use Langchain's robust OpenAI integration to access 
# hundreds of different open source and proprietary models.

llm = ChatOpenAI(
    openai_api_key=settings.openrouter_api_key,
    openai_api_base="https://openrouter.ai/api/v1",
    model_name="openai/gpt-4o-mini", # Standard model from AI_interview_agent
)

def rewrite_query(query: str, chat_history: list) -> str:
    """
    If the user asks a follow up question like "what are the exceptions to it?",
    the vector database won't know what "it" is. This uses a fast LLM to rewrite
    the query into a standalone search term based on the history.
    """
    if not chat_history:
        return query
        
    messages = [
        SystemMessage(
            content=(
                "You are an AI assistant. Analyze the user's follow-up question. "
                "1. If the user's question is primarily a greeting, pleasantry, or asking who you are (e.g., 'hi', 'hello', 'good morning', 'how are you', 'hello what is this'), "
                "you MUST return exactly this string and nothing else: [GREETING]\n"
                "2. If the user's question is completely unrelated to law, legal documents, or the ongoing legal discussion (e.g., sports, cooking), "
                "you MUST return exactly this string and nothing else: [OFF_TOPIC]\n"
                "3. Otherwise, rephrase the follow-up question to be a standalone search query "
                "for a vector database. If it's already standalone, return it as is. "
                "Do NOT answer the question, JUST return the rewritten search query. "
                "Example: if history is about 'murder' and user says 'what are the exceptions', "
                "rewrite as 'What are the exceptions to murder?'"
            )
        )
    ]
    
    # Inject conversational memory (up to last 4 messages to keep context window small)
    for msg in chat_history[-4:]:
        if msg.get("role") == "user":
            messages.append(HumanMessage(content=msg.get("content", "")))
        elif msg.get("role") == "ai":
            messages.append(AIMessage(content=msg.get("content", "")))
            
    messages.append(HumanMessage(content=f"Follow up question: {query}"))
    
    response = llm.invoke(messages)
    return response.content.strip()

def generate_answer(query: str, retrieved_context: list, chat_history: list = None) -> str:
    # Combine the top chunks into a single string of context, including their source metadata!
    context_parts = []
    for doc in retrieved_context:
        filename = doc.metadata.get('source', 'Unknown Document').split('\\')[-1].split('/')[-1]
        page = doc.metadata.get('page', 0) + 1
        header = f"--- SOURCE: {filename} (Page {page}) ---"
        context_parts.append(f"{header}\n{doc.page_content}")
        
    context_text = "\n\n".join(context_parts)
    
    # Construct the RAG prompt
    messages = [
        SystemMessage(
            content=(
                "You are an expert Indian legal assistant. "
                "You must ONLY answer the user's question using the provided context from the official legal documents. "
                "Do not hallucinate or use outside knowledge. If the answer is not contained in the context, politely inform the user. "
                "Answer in a natural, helpful, human tone. "
                "Always include proper citations by explicitly mentioning the specific sections, chapters, or acts that you draw the information from."
            )
        )
    ]

    # Inject conversational memory (up to last 6 messages to keep context window small)
    if chat_history:
        for msg in chat_history[-6:]:
            if msg.get("role") == "user":
                messages.append(HumanMessage(content=msg.get("content", "")))
            elif msg.get("role") == "ai":
                messages.append(AIMessage(content=msg.get("content", "")))
    
    # Finally, append the actual new query with the retrieved context
    messages.append(
        HumanMessage(
            content=f"Here is the retrieved legal context for my next question:\n{context_text}\n\nQuestion: {query}"
        )
    )
    
    # Get the AI response
    response = llm.invoke(messages)
    
    return response.content
