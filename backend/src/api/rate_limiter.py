import time
import uuid
from fastapi import HTTPException, Depends, Request
from src.api.auth import get_current_user

# Lua script for atomic sliding window rate limiting
SLIDING_WINDOW_LUA = '''
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

local window_start = now - window

-- Remove old elements outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- Get current count within the window
local count = redis.call('ZCARD', key)

if count >= limit then
    return 0 -- Rate limit exceeded
else
    -- Add current request and extend expiration
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, window)
    return 1 -- Request allowed
end
'''

class SlidingWindowRateLimiter:
    def __init__(self, times: int, seconds: int):
        self.times = times
        self.seconds = seconds

    async def __call__(self, request: Request, current_user: dict = Depends(get_current_user)):
        # Lazy import to avoid circular dependency
        from src.api.routes import redis_client 
        
        user_id = current_user.get("user_id")
        if not user_id:
            user_id = request.client.host if request.client else "unknown"
            
        key = f"rate_limit:sliding:{user_id}"
        now = time.time()
        member = f"{now}:{uuid.uuid4().hex[:8]}"

        # Execute the Lua script atomically
        allowed = await redis_client.eval(
            SLIDING_WINDOW_LUA, 
            1,          # Number of keys
            key,        # KEYS[1]
            now,        # ARGV[1]
            self.seconds, # ARGV[2]
            self.times,   # ARGV[3]
            member      # ARGV[4]
        )
        
        if not allowed:
            raise HTTPException(status_code=429, detail="Too Many Requests")
