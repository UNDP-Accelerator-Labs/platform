exports.isPasswordSecure = (password) => {
  // Check complexity (contains at least one uppercase, lowercase, number, and special character)
  const uppercaseRegex = /[A-Z]/;
  const lowercaseRegex = /[a-z]/;
  const numberRegex = /[0-9]/;
  const specialCharRegex = /[!@#$%^&*\(\)]/;
  // Check against common passwords (optional)
  const commonPasswords = ['password', '123456', 'qwerty'];
  const checkPass = {
    'pw-length': !(password.length < 8),  // Check length
    'pw-upper': uppercaseRegex.test(password),
    'pw-lower': lowercaseRegex.test(password),
    'pw-number': numberRegex.test(password),
    'pw-special': specialCharRegex.test(password),
    'pw-common': !commonPasswords.includes(password),
  };

  const msgs = {
    'pw-length': 'Password is too short!',
    'pw-upper': 'Password requires at least one uppercase letter!',
    'pw-lower': 'Password requires at least one lowercase letter!',
    'pw-number': 'Password requires at least one numberal!',
    'pw-special': 'Password requires at least one of the special characters: !@#$%^&*()',
    'pw-common': 'Password cannot be a commonly used password!',
  };

  return Object.keys(checkPass).filter((key) => !checkPass[key]).map((key) => msgs[key]).join('\n');
}
