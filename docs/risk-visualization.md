# Risk Visualization Design

## Overview

The risk visualization system helps users understand their potential fund recovery in case of protocol exploits. This is crucial for users to make informed decisions about their investment allocations between AAA and AA tranches.

## Recovery Model

The recovery model is based on the severity of the exploit damage:

* For x ∈ [0,1], where x is the severity of damage (portion of funds lost):

  Recovery(x) = (min(1,2(1−x)))⋅AAA + (max(0,1−2x))⋅AA

This formula unifies the two cases:
  * AAA tokens: min(1,2(1−x))⋅AAA ensures full recovery when x < 0.5 and proportional recovery when x ≥ 0.5
  * AA tokens: max(0,1−2x)⋅AA ensures proportional recovery when x < 0.5 and zero recovery when x ≥ 0.5

This model demonstrates the key protective features:
1. AAA tokens have priority in recovery
2. AA tokens only recover when damage is less than 50% (x < 0.5), with recovery proportional to (1-2x)
3. AAA tokens maintain full value until 50% loss, then recover proportionally to 2(1-x)
4. Recovery rates where:
   - At x = 0 (no damage): Full recovery of both AAA and AA tokens
   - At x = 0.5 (50% loss): Full recovery of AAA tokens, no recovery of AA tokens
   - At x = 1 (total loss): No recovery of either token type
4. Protection mechanics:
   - For minor exploits (x < 0.5), AAA tokens are fully protected while AA tokens recover proportionally
   - For severe exploits (x ≥ 0.5), AAA tokens get priority on remaining funds while AA tokens are not recovered

## Visualization Approach

### Interactive Line Chart

The primary visualization will be an interactive line chart:

```
Y-axis: Total Recovery Amount (USDC)
X-axis: Severity of Exploit (Portion of Funds Lost)

    ^    Total Recovery
    |    ___________
    |    \
    |     \
    |      \
    |       \_______
    +--------+--------+-----
    0     0.5       1.0
    (no    (50%    (total
   damage)  loss)   loss)
```

### Key Features

1. **Recovery Line**
   - Single line showing total recovery amount in USDC
   - Clear visual representation of the 50% threshold effect
   - Intuitive relationship between exploit severity and recoverable funds

2. **Threshold Indicators**
   - Prominent marker at 50% threshold
   - Visual indication of recovery state changes
   - Clear annotations explaining threshold implications

3. **Interactive Elements**
   - Hover tooltips showing exact recovery amounts
   - Click-to-lock feature for detailed analysis
   - Dynamic calculations based on user's holdings

### Technical Implementation

1. **Chart Library**
   - Use Recharts for React integration
   - Material-UI theming support
   - Responsive design support

2. **Data Representation**
   ```javascript
   const dataPoints = [
     { x: 0, aaa: aaaTokens, aa: aaTokens }, // No damage
     { x: 0.25, aaa: aaaTokens, aa: 0.5 * aaTokens }, // 25% loss
     { x: 0.5, aaa: aaaTokens, aa: 0 }, // 50% loss threshold
     { x: 0.75, aaa: 0.5 * aaaTokens, aa: 0 }, // 75% loss
     { x: 1, aaa: 0, aa: 0 } // Total loss
   ];

   // Recovery calculation function
   const calculateRecovery = (x, aaaTokens, aaTokens) => ({
     aaa: Math.min(1, 2 * (1 - x)) * aaaTokens,
     aa: Math.max(0, 1 - 2 * x) * aaTokens
   });
   ```

3. **Integration**
   - Dashboard component integration
   - Real-time updates with portfolio changes
   - Consistent styling with existing UI

## User Benefits

1. **Clear Risk Understanding**
   - Visual representation of recovery scenarios
   - Immediate understanding of tranche differences
   - Dynamic updates based on portfolio

2. **Decision Support**
   - Helps users balance risk/reward
   - Clear visualization of protection mechanisms
   - Interactive exploration of scenarios

3. **Educational Value**
   - Tooltips explaining mechanics
   - Visual demonstration of protection levels
   - Clear relationship between risk and recovery

## Next Steps

1. Technical Implementation
   - Set up chart library integration
   - Implement data calculation logic
   - Create interactive features

2. User Testing
   - Validate clarity of visualization
   - Test interactive features
   - Gather feedback on usefulness

3. Integration
   - Add to dashboard
   - Connect to portfolio data
   - Implement real-time updates
