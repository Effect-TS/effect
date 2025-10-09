#!/bin/bash
# Helper script to test the debug steps CLI
# Usage: ./bin/test-steps.sh [max-steps]

set -e

# Configuration
PORT=9229
MAX_STEPS=${1:-50}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
TEST_FIXTURE="$PROJECT_DIR/test-fixtures/broken-simple.js"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔍 Testing @effect-native/debug steps CLI${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# No dependencies needed - we auto-discover WebSocket URL from HTTP endpoint

# Step 1: Start the test fixture with inspector
echo -e "${YELLOW}Step 1: Starting test fixture with inspector...${NC}"
echo "         node --inspect-brk=$PORT $TEST_FIXTURE"

node --inspect-brk=$PORT "$TEST_FIXTURE" &
APP_PID=$!

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    if kill -0 $APP_PID 2>/dev/null; then
        kill $APP_PID 2>/dev/null || true
        wait $APP_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Register cleanup on exit
trap cleanup EXIT INT TERM

# Step 2: Wait for inspector to be ready
echo -e "${YELLOW}Step 2: Waiting for inspector to be ready...${NC}"
MAX_RETRIES=10
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if curl -s http://127.0.0.1:$PORT/json > /dev/null 2>&1; then
        echo -e "${GREEN}         ✅ Inspector is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 0.5
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Error: Inspector failed to start${NC}"
    exit 1
fi

# Step 3: Run the steps CLI with HTTP endpoint (auto-discovers WebSocket URL)
echo -e "${YELLOW}Step 3: Running steps CLI (max $MAX_STEPS steps)...${NC}"
echo -e "${YELLOW}         Using HTTP endpoint: http://127.0.0.1:$PORT${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

node --import tsx/esm "$PROJECT_DIR/src/cli/steps.ts" --ws-url "127.0.0.1:$PORT" --max-steps "$MAX_STEPS"

EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Test completed successfully${NC}"
else
    echo -e "${RED}❌ Test failed with exit code $EXIT_CODE${NC}"
fi

exit $EXIT_CODE
