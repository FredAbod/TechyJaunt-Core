# Course Progress Tracking System

This document explains how the course progress tracking works in the TechyJaunt Learning Platform.

```mermaid
flowchart TD
    Start([User Enrolls in Course]) --> CreateProgress[Create Progress Record]
    
    CreateProgress --> ProgressDB[(Progress Database)]
    ProgressDB --> |"userId: ObjectId<br/>courseId: ObjectId<br/>overallProgress: 0%<br/>currentModule: 0<br/>modules: []"| InitialState[Initial Progress State]
    
    InitialState --> FirstModule{Can Access<br/>First Module?}
    FirstModule -->|Yes| UnlockModule1[Unlock Module 1]
    FirstModule -->|No| NoAccess[No Access - Check Subscription]
    
    UnlockModule1 --> ModuleProgress[Module Progress Tracking]
    
    subgraph ModuleProgress["Module Progress Tracking"]
        direction TB
        WatchLesson[User Watches Lesson] --> UpdateProgress[Update Lesson Progress]
        UpdateProgress --> CalcWatchTime[Calculate Watch Time %]
        CalcWatchTime --> CheckComplete{Lesson Complete?<br/>>= 80% watched}
        
        CheckComplete -->|Yes| MarkLessonComplete[Mark Lesson Complete]
        CheckComplete -->|No| SaveProgress[Save Partial Progress]
        
        MarkLessonComplete --> CheckModuleComplete{All Lessons<br/>in Module Complete?}
        SaveProgress --> UpdateOverall[Update Overall Progress]
        
        CheckModuleComplete -->|No| UpdateOverall
        CheckModuleComplete -->|Yes| CheckAssessment{Assessment<br/>Required?}
        
        CheckAssessment -->|No| CompleteModule[Complete Module]
        CheckAssessment -->|Yes| TakeAssessment[Take Assessment]
        
        TakeAssessment --> AssessmentResult{Assessment<br/>Passed?}
        AssessmentResult -->|No| RetryAssessment[Can Retry Assessment]
        AssessmentResult -->|Yes| CompleteModule
        
        CompleteModule --> UnlockNext[Unlock Next Module]
        RetryAssessment --> TakeAssessment
    end
    
    UnlockNext --> CheckCourseComplete{All Modules<br/>Complete?}
    CheckCourseComplete -->|No| NextModule[Access Next Module]
    CheckCourseComplete -->|Yes| CourseComplete[Course Complete<br/>Generate Certificate]
    
    NextModule --> ModuleProgress
    
    subgraph Database["Database Schema"]
        direction TB
        ProgressSchema["`**Progress Schema**
        userId: ObjectId
        courseId: ObjectId
        overallProgress: Number (0-100)
        currentModule: Number
        isCompleted: Boolean
        completedAt: Date
        lastActivityAt: Date
        modules: [ModuleProgress]`"]
        
        ModuleSchema["`**Module Progress Schema**
        moduleId: ObjectId
        isUnlocked: Boolean
        isCompleted: Boolean
        progress: Number (0-100)
        lessons: [LessonProgress]
        assessmentAttempts: [Assessment]`"]
        
        LessonSchema["`**Lesson Progress Schema**
        lessonId: ObjectId
        isCompleted: Boolean
        watchTime: Number (seconds)
        totalDuration: Number (seconds)
        completedAt: Date`"]
        
        ProgressSchema -.-> ModuleSchema
        ModuleSchema -.-> LessonSchema
    end
    
    subgraph AccessControl["Access Control Logic"]
        direction TB
        CheckAccess[Check Module Access] --> HasSubscription{Has Valid<br/>Subscription?}
        HasSubscription -->|No| SubscriptionRequired[Subscription Required]
        HasSubscription -->|Yes| CheckSequential{Sequential<br/>Access?}
        
        CheckSequential -->|Yes| PreviousComplete{Previous Module<br/>Complete?}
        CheckSequential -->|No| AllowAccess[Allow Access]
        
        PreviousComplete -->|Yes| AllowAccess
        PreviousComplete -->|No| MustComplete[Must Complete Previous]
        
        SubscriptionRequired --> NoAccess
        MustComplete --> NoAccess
        AllowAccess --> GrantAccess[Grant Module Access]
    end
    
    subgraph ProgressCalculation["Progress Calculation"]
        direction TB
        CalcLesson["`**Lesson Progress**
        watchTime / totalDuration * 100
        Minimum 80% to mark complete`"] 
        
        CalcModule["`**Module Progress**
        completedLessons / totalLessons * 100
        + assessment pass (if required)`"]
        
        CalcOverall["`**Overall Course Progress**
        Sum of all module progress / total modules
        Weighted by module importance`"]
        
        CalcLesson --> CalcModule
        CalcModule --> CalcOverall
    end
    
    subgraph Events["Progress Events"]
        direction TB
        VideoProgress[Video Progress Event] --> UpdateDB[Update Database]
        LessonComplete[Lesson Complete Event] --> UpdateDB
        ModuleComplete[Module Complete Event] --> UpdateDB
        AssessmentSubmit[Assessment Submit Event] --> UpdateDB
        
        UpdateDB --> NotifyFrontend[Notify Frontend]
        NotifyFrontend --> UpdateUI[Update Progress UI]
    end
    
    style Start fill:#e1f5fe
    style CourseComplete fill:#c8e6c9
    style NoAccess fill:#ffcdd2
    style Database fill:#f3e5f5
    style AccessControl fill:#fff3e0
    style ProgressCalculation fill:#e8f5e8
    style Events fill:#fce4ec
```

## Key Features:

### 1. **Sequential Module Unlocking**
- Users must complete modules in order
- Next module unlocks only after current module completion
- Prevents skipping ahead without learning foundations

### 2. **Lesson Progress Tracking**
- Tracks video watch time in real-time
- Calculates completion percentage (watchTime/totalDuration)
- Requires minimum 80% watch time to mark lesson complete

### 3. **Assessment Integration**
- Modules can have required assessments
- Must pass assessment to complete module
- Multiple attempts allowed with configurable limits
- Handles timeout submissions gracefully

### 4. **Subscription-Based Access**
- Validates subscription before allowing module access
- Different subscription tiers may have different access levels
- Prevents unauthorized access to premium content

### 5. **Real-time Progress Updates**
- Frontend receives real-time progress updates
- Database tracks last activity timestamp
- Progress persists across sessions

### 6. **Flexible Progress Calculation**
```javascript
// Lesson Progress
lessonProgress = (watchTime / totalDuration) * 100

// Module Progress  
moduleProgress = (completedLessons / totalLessons) * 100

// Overall Course Progress
overallProgress = sumOfModuleProgress / totalModules
```

### 7. **Certificate Generation**
- Automatic certificate generation upon course completion
- Tracks completion date and time
- Can be downloaded or shared

This system ensures structured learning while providing flexibility for different learning styles and paces.
