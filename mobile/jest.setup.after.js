// Loading saved data is asynchronous; give the testing library's waits enough room.
require('@testing-library/react-native').configure({ asyncUtilTimeout: 5000 });
